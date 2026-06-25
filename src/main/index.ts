import { app, shell, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { initDb } from './db'
import { registerHandlers } from './handlers'
import { registerMediaScheme, registerMediaProtocol } from './media'
import { initUpdater } from './updater'
import { initVpn, shutdownVpn } from './vpn'
import { registerBackupHandlers, maybeAutoBackup } from './backup'
import { hardenWebContents } from './fingerprint'

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
  win.on('maximize', () => win.webContents.send('win:maximized', true))
  win.on('unmaximize', () => win.webContents.send('win:maximized', false))

  // Open target=_blank / window.open links in the OS browser, not new Electron windows.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  registerMediaProtocol()
  await initDb()
  registerHandlers()
  registerBackupHandlers()
  initUpdater()
  initVpn()
  maybeAutoBackup()

  app.on('web-contents-created', (_e, contents) => {
    if (contents.getType() !== 'webview') return

    // Per-persona browser fingerprint hardening (UA + canvas/WebGL/navigator spoof).
    hardenWebContents(contents)

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

    // The Mailbox webview signs into webmail (e.g. Gmail), which tries to open its
    // login in a popup window. Keep it inline: navigate the webview itself instead
    // of spawning a separate window.
    if (contents.session === session.fromPartition('persist:gw-mailbox')) {
      contents.setWindowOpenHandler(({ url }) => {
        if (url && /^https?:\/\//i.test(url)) contents.loadURL(url).catch(() => {})
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
