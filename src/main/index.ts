import { app, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { initDb } from './db'
import { openInAppTabs } from './browserbridge'
import { registerHandlers } from './handlers'
import { registerMediaScheme, registerMediaProtocol } from './media'
import { initUpdater } from './updater'
import { initVpn, shutdownVpn } from './vpn'
import { registerBackupHandlers, maybeAutoBackup } from './backup'
import { hardenWebContents } from './fingerprint'
import { consumeIntentionalMaximize } from './win-state'
import { attachContextMenu } from './contextmenu'

// Must run before app is ready.
registerMediaScheme()

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#0a0c10',
    title: 'GhostWire',
    icon: join(__dirname, '../../icon.png'),
    // Frameless — we draw our own themed title bar in the renderer.
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // Enables <webview> guests used by the embedded browser & sock-puppet sessions.
      webviewTag: true
    }
  })

  win.on('ready-to-show', () => win.show())

  // Keep the renderer's maximize/restore button in sync.
  // If the maximize was NOT triggered by the in-app topbar button (e.g. the OS
  // fired WM_NCLBUTTONDBLCLK from a double-click on an Electron drag region),
  // immediately revert it so the window doesn't go black.
  win.on('maximize', () => {
    win.webContents.send('win:maximized', true)
    if (!consumeIntentionalMaximize()) {
      setImmediate(() => { if (!win.isDestroyed()) win.unmaximize() })
    }
  })
  win.on('unmaximize', () => win.webContents.send('win:maximized', false))

  // Open target=_blank / window.open links as in-app browser tabs — never the OS browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openInAppTabs([url])
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Strip the "Electron/x" and app tokens from the default UA so embedded pages
  // present as plain desktop Chrome — but keep the REAL Chromium version so it
  // matches the Sec-CH-UA client hints. A mismatch there is what makes Google /
  // Cloudflare loop their challenge ("the URL end keeps changing"). Personas
  // still override this with their own spoofed UA.
  try {
    app.userAgentFallback = app.userAgentFallback.replace(/ (?:GhostWire|Electron)\/\S+/g, '')
  } catch {
    /* ignore */
  }

  registerMediaProtocol()
  await initDb()
  registerHandlers()
  registerBackupHandlers()
  initUpdater()
  initVpn()
  maybeAutoBackup()


  app.on('web-contents-created', (_e, contents) => {
    if (contents.getType() !== 'webview') return

    // Force English Accept-Language for every webview session so Electron doesn't
    // fall back to the OS locale. On some Windows installs this ends up as
    // bn-BD (Bengali/Bangladesh), making every site serve content in Bengali.
    try {
      const ses = contents.session
      ses.setUserAgent(ses.getUserAgent(), 'en-US,en;q=0.9')
    } catch {
      /* ignore */
    }

    // Per-persona browser fingerprint hardening (UA + canvas/WebGL/navigator spoof).
    // This may override the UA for persona sessions but preserves the acceptLanguages
    // set above (fingerprint.ts also passes 'en-US,en;q=0.9' explicitly).
    hardenWebContents(contents)

    // Right-click menu: add images to evidence, reverse search, copy/paste.
    attachContextMenu(contents)

    // Neutralize WebAuthn/passkeys inside embedded sign-up flows (e.g. X/Twitter)
    // so sites don't pop the Windows Hello / security-key dialog and instead
    // offer regular password sign-up. Injected early on every navigation.
    contents.on('dom-ready', () => {
      contents
        .executeJavaScript(
          `(function(){try{
            if (navigator.credentials){
              navigator.credentials.create = function(){ return Promise.reject(new DOMException('disabled','NotAllowedError')); };
              navigator.credentials.get = function(){ return Promise.reject(new DOMException('disabled','NotAllowedError')); };
            }
            if (window.PublicKeyCredential){
              window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = function(){ return Promise.resolve(false); };
              if (window.PublicKeyCredential.isConditionalMediationAvailable) window.PublicKeyCredential.isConditionalMediationAvailable = function(){ return Promise.resolve(false); };
            }
          }catch(e){}})();`
        )
        .catch(() => {})
    })

    // The Mailbox webview signs into webmail (e.g. Gmail). Keep popups inline and
    // redirect external link clicks to the in-app browser so the webmail is never
    // replaced by an unrelated site the user can't navigate back from.
    if (contents.session === session.fromPartition('persist:gw-mailbox')) {
      // Trusted base domains — navigation within these stays in the mailbox webview.
      const WEBMAIL_BASES = [
        'google.com', 'live.com', 'microsoft.com',
        'proton.me', 'proton.ch',
        'yahoo.com', 'icloud.com', 'apple.com', 'zoho.com'
      ]
      // Popup / target=_blank → in-app browser tab, not a new OS window.
      contents.setWindowOpenHandler(({ url }) => {
        if (url && /^https?:\/\//i.test(url)) openInAppTabs([url])
        return { action: 'deny' }
      })
      // Regular link clicks that would navigate the webview away → redirect external
      // URLs to the in-app browser so the mailbox is never clobbered.
      contents.on('will-navigate', (e, url) => {
        if (!/^https?:\/\//i.test(url)) return
        try {
          const { hostname } = new URL(url)
          if (WEBMAIL_BASES.some((b) => hostname === b || hostname.endsWith(`.${b}`))) return
        } catch {}
        e.preventDefault()
        openInAppTabs([url])
      })
    } else {
      // Any other embedded page: open popups / target=_blank as a new in-app tab,
      // never an external window — EXCEPT Google OAuth/SSO popups, which need
      // window.opener intact to postMessage auth tokens back to the opener page.
      // Denying and re-routing to a tab severs window.opener and leaves Google's
      // GSI flow (used by X, Reddit, and others) stuck on a white screen.
      contents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\/accounts\.google\.com\//i.test(url)) {
          return {
            action: 'allow',
            overrideBrowserWindowOptions: {
              width: 500,
              height: 640,
              autoHideMenuBar: true,
              webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
            }
          }
        }
        openInAppTabs([url])
        return { action: 'deny' }
      })
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => shutdownVpn())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
