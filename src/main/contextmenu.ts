import { Menu, MenuItem, BrowserWindow, clipboard, shell, Notification, type WebContents } from 'electron'
import { addEvidenceFromUrl, getSettings } from './handlers'

const enc = encodeURIComponent
const REVERSE: [string, (u: string) => string][] = [
  ['Google Lens', (u) => `https://lens.google.com/uploadbyurl?url=${enc(u)}`],
  ['Yandex', (u) => `https://yandex.com/images/search?rpt=imageview&url=${enc(u)}`],
  ['Bing', (u) => `https://www.bing.com/images/searchbyimage?cbir=sbi&imgurl=${enc(u)}`],
  ['TinEye', (u) => `https://tineye.com/search?url=${enc(u)}`]
]

function notify(title: string, body: string): void {
  try {
    if (Notification.isSupported()) new Notification({ title, body: body.slice(0, 140) }).show()
  } catch {
    /* notifications unavailable */
  }
}

/** Build a right-click menu for guest webviews: add images to evidence, reverse
 *  image search, copy/paste in fields, and link helpers. (Webviews have no
 *  default context menu in Electron.) */
export function attachContextMenu(contents: WebContents): void {
  contents.on('context-menu', (_e, params) => {
    const menu = new Menu()
    const imgUrl = params.mediaType === 'image' ? params.srcURL : ''

    if (imgUrl) {
      menu.append(
        new MenuItem({
          label: 'Add image to evidence',
          click: async () => {
            try {
              await addEvidenceFromUrl(imgUrl, getSettings().activeProjectId ?? null)
              notify('Added to evidence', 'Open the Evidence Board to view metadata (EXIF, hash).')
            } catch (e) {
              notify('Could not add image', String((e as Error)?.message ?? e))
            }
          }
        })
      )
      if (/^https?:\/\//i.test(imgUrl)) {
        const sub = new Menu()
        for (const [label, fn] of REVERSE) sub.append(new MenuItem({ label, click: () => shell.openExternal(fn(imgUrl)) }))
        menu.append(new MenuItem({ label: 'Reverse image search', submenu: sub }))
        menu.append(new MenuItem({ label: 'Open image in browser', click: () => shell.openExternal(imgUrl) }))
      }
      menu.append(new MenuItem({ label: 'Copy image address', click: () => clipboard.writeText(imgUrl) }))
      menu.append(new MenuItem({ type: 'separator' }))
    }

    if (params.linkURL) {
      menu.append(new MenuItem({ label: 'Copy link', click: () => clipboard.writeText(params.linkURL) }))
      menu.append(new MenuItem({ label: 'Open link in system browser', click: () => shell.openExternal(params.linkURL) }))
      menu.append(new MenuItem({ type: 'separator' }))
    }

    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'cut', enabled: params.editFlags.canCut }))
      menu.append(new MenuItem({ role: 'copy', enabled: params.editFlags.canCopy }))
      menu.append(new MenuItem({ role: 'paste', enabled: params.editFlags.canPaste }))
      menu.append(new MenuItem({ role: 'selectAll' }))
    } else if (params.selectionText) {
      menu.append(new MenuItem({ role: 'copy' }))
      menu.append(
        new MenuItem({
          label: 'Search selection on Google',
          click: () => shell.openExternal(`https://www.google.com/search?q=${enc(params.selectionText)}`)
        })
      )
    }

    if (menu.items.length === 0) {
      menu.append(new MenuItem({ label: 'Back', enabled: contents.canGoBack(), click: () => contents.goBack() }))
      menu.append(new MenuItem({ label: 'Reload', click: () => contents.reload() }))
    }

    const win = (contents.hostWebContents && BrowserWindow.fromWebContents(contents.hostWebContents)) ?? BrowserWindow.getFocusedWindow()
    menu.popup(win ? { window: win } : undefined)
  })
}
