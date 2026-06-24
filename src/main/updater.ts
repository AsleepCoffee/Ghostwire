import { app, ipcMain, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

function broadcast(payload: Record<string, unknown>): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('updates:status', payload)
  }
}

/** Wire up GitHub-backed auto-updates and the renderer-facing update IPC. */
export function initUpdater(): void {
  // Don't download until the user opts in — they get an Install / Skip prompt.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => broadcast({ state: 'checking' }))
  autoUpdater.on('update-available', (i) => broadcast({ state: 'available', version: i.version }))
  autoUpdater.on('update-not-available', () => broadcast({ state: 'none' }))
  autoUpdater.on('download-progress', (p) =>
    broadcast({ state: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (i) => broadcast({ state: 'ready', version: i.version }))
  autoUpdater.on('error', (e) => broadcast({ state: 'error', message: String(e?.message ?? e) }))

  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('updates:check', () => {
    // Auto-update only works in a packaged build (needs app-update.yml + releases).
    if (!app.isPackaged) {
      broadcast({ state: 'dev' })
      return
    }
    autoUpdater.checkForUpdates().catch((e) => broadcast({ state: 'error', message: String(e) }))
  })
  ipcMain.handle('updates:download', () => {
    if (app.isPackaged) autoUpdater.downloadUpdate().catch((e) => broadcast({ state: 'error', message: String(e) }))
  })
  ipcMain.handle('updates:install', () => autoUpdater.quitAndInstall())

  // Silent check shortly after launch.
  if (app.isPackaged) {
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 4000)
  }
}
