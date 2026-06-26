import { BrowserWindow } from 'electron'

/** Forward URLs to the renderer so they open as tabs in the in-app browser.
 *  Used for every main-process origin (context menu, popups, target=_blank,
 *  the shell:openExternal handler) so links never leave the app. */
export function openInAppTabs(urls: string[]): void {
  const list = urls.filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))
  if (list.length === 0) return
  const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed())
  if (win) win.webContents.send('browser:open', list)
}
