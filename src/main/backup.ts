import { app, dialog, ipcMain, shell, BrowserWindow } from 'electron'
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, rmSync, writeFileSync } from 'fs'
import { join, basename } from 'path'
import AdmZip from 'adm-zip'
import { persist, databasePath } from './db'
import { mediaRoot } from './media'
import { getSettings, putSetting } from './handlers'

/** How many timestamped backups to keep before pruning the oldest. */
const KEEP = 15
const PREFIX = 'GhostWire-Backup-'

export interface BackupInfo {
  name: string
  path: string
  at: number
  sizeMB: number
}

function ts(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/** Recursively copy a directory. */
function copyDir(src: string, dest: string): void {
  if (!existsSync(src)) return
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, entry.name)
    const d = join(dest, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else if (entry.isFile()) copyFileSync(s, d)
  }
}

function dirSizeBytes(dir: string): number {
  let total = 0
  if (!existsSync(dir)) return 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) total += dirSizeBytes(p)
    else if (entry.isFile()) total += statSync(p).size
  }
  return total
}

/** A backup folder is valid if it contains the database file. */
function isBackup(dir: string): boolean {
  return existsSync(join(dir, 'ghostwire.db'))
}

export function listBackups(dir?: string): BackupInfo[] {
  const base = dir ?? getSettings().backupDir
  if (!base || !existsSync(base)) return []
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith(PREFIX) && isBackup(join(base, e.name)))
    .map((e) => {
      const p = join(base, e.name)
      return { name: e.name, path: p, at: statSync(p).mtimeMs, sizeMB: Math.round((dirSizeBytes(p) / 1048576) * 10) / 10 }
    })
    .sort((a, b) => b.at - a.at)
}

function prune(base: string): void {
  const backups = listBackups(base)
  for (const b of backups.slice(KEEP)) {
    try {
      rmSync(b.path, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

/** Copy the database + media into a new timestamped folder under the backup dir. */
export function runBackup(): { ok: boolean; path?: string; error?: string } {
  try {
    const dir = getSettings().backupDir
    if (!dir) return { ok: false, error: 'No backup folder set.' }
    mkdirSync(dir, { recursive: true })
    persist(true) // flush the in-memory DB to disk first

    const dest = join(dir, `${PREFIX}${ts()}`)
    mkdirSync(dest, { recursive: true })
    copyFileSync(databasePath(), join(dest, 'ghostwire.db'))
    copyDir(mediaRoot(), join(dest, 'media'))

    putSetting('lastBackupAt', Date.now())
    prune(dir)
    return { ok: true, path: dest }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) }
  }
}

/** Restore the DB + media from a backup folder, then relaunch the app. */
function restoreBackup(fromDir: string): { ok: boolean; error?: string } {
  try {
    if (!isBackup(fromDir)) return { ok: false, error: 'That folder is not a GhostWire backup.' }
    // Replace the live DB file (the app relaunches so the new file loads fresh).
    copyFileSync(join(fromDir, 'ghostwire.db'), databasePath())
    const mediaSrc = join(fromDir, 'media')
    if (existsSync(mediaSrc)) {
      // Clear current media, then copy the backup's media in.
      try {
        rmSync(mediaRoot(), { recursive: true, force: true })
      } catch {
        /* ignore */
      }
      copyDir(mediaSrc, mediaRoot())
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) }
  }
}

/** On launch: if auto-backup is on and the last one is >20h old, back up quietly. */
export function maybeAutoBackup(): void {
  const s = getSettings()
  if (!s.autoBackup || !s.backupDir) return
  const last = s.lastBackupAt ?? 0
  if (Date.now() - last > 20 * 3600 * 1000) {
    setTimeout(() => runBackup(), 4000) // don't slow startup
  }
}

export function registerBackupHandlers(): void {
  ipcMain.handle('backup:run', () => runBackup())
  ipcMain.handle('backup:list', () => listBackups())

  ipcMain.handle('backup:pickFolder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Choose a backup folder',
      properties: ['openDirectory', 'createDirectory']
    })
    if (res.canceled || !res.filePaths[0]) return null
    putSetting('backupDir', res.filePaths[0])
    return res.filePaths[0]
  })

  ipcMain.handle('backup:reveal', (_e, path?: string) => {
    const target = path ?? getSettings().backupDir
    if (target && existsSync(target)) shell.openPath(target)
  })

  ipcMain.handle('backup:restore', async (_e, path?: string) => {
    let dir = path
    if (!dir) {
      const win = BrowserWindow.getFocusedWindow()
      const res = await dialog.showOpenDialog(win!, {
        title: 'Select a GhostWire backup folder to restore',
        properties: ['openDirectory'],
        defaultPath: getSettings().backupDir
      })
      if (res.canceled || !res.filePaths[0]) return { ok: false, error: 'Cancelled' }
      dir = res.filePaths[0]
    }
    const r = restoreBackup(dir)
    if (r.ok) {
      // Relaunch so the restored database loads cleanly.
      app.relaunch()
      app.exit(0)
    }
    return r
  })

  // ---- Portable single-file export / import (cross-platform) ----
  ipcMain.handle('backup:exportPack', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showSaveDialog(win!, {
      title: 'Export GhostWire data',
      defaultPath: `GhostWire-Export-${ts()}.gwpack`,
      filters: [{ name: 'GhostWire pack', extensions: ['gwpack'] }]
    })
    if (res.canceled || !res.filePath) return null
    try {
      persist(true)
      const zip = new AdmZip()
      zip.addLocalFile(databasePath()) // ghostwire.db
      if (existsSync(mediaRoot())) zip.addLocalFolder(mediaRoot(), 'media')
      zip.writeZip(res.filePath)
      return res.filePath
    } catch (e) {
      return { error: String((e as Error)?.message ?? e) }
    }
  })

  ipcMain.handle('backup:importPack', async (_e, path?: string) => {
    let file = path
    if (!file) {
      const win = BrowserWindow.getFocusedWindow()
      const res = await dialog.showOpenDialog(win!, {
        title: 'Import a GhostWire pack',
        properties: ['openFile'],
        filters: [{ name: 'GhostWire pack', extensions: ['gwpack', 'zip'] }]
      })
      if (res.canceled || !res.filePaths[0]) return { ok: false, error: 'Cancelled' }
      file = res.filePaths[0]
    }
    try {
      const zip = new AdmZip(file)
      const dbEntry = zip.getEntries().find((e) => basename(e.entryName) === 'ghostwire.db' && !e.isDirectory)
      if (!dbEntry) return { ok: false, error: 'That file is not a GhostWire pack (no database inside).' }
      writeFileSync(databasePath(), dbEntry.getData())
      // Replace media with the pack's media folder.
      try {
        rmSync(mediaRoot(), { recursive: true, force: true })
      } catch {
        /* ignore */
      }
      mkdirSync(mediaRoot(), { recursive: true })
      for (const e of zip.getEntries()) {
        if (e.isDirectory) continue
        const norm = e.entryName.replace(/\\/g, '/')
        if (!norm.startsWith('media/')) continue
        const dest = join(mediaRoot(), norm.slice('media/'.length))
        mkdirSync(join(dest, '..'), { recursive: true })
        writeFileSync(dest, e.getData())
      }
      app.relaunch()
      app.exit(0)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String((e as Error)?.message ?? e) }
    }
  })
}
