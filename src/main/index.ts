import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { initDb } from './db'
import { registerHandlers } from './handlers'
import { registerMediaScheme, registerMediaProtocol } from './media'
import { initUpdater } from './updater'

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
    autoHideMenuBar: true,
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
  initUpdater()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
