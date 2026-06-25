import { app, protocol, net, dialog, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { join, extname, basename } from 'path'
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'fs'
import { pathToFileURL } from 'url'

const SCHEME = 'gwmedia'

export function mediaRoot(): string {
  const dir = join(app.getPath('userData'), 'media')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function kindDir(kind: string): string {
  const safe = kind.replace(/[^a-z0-9_-]/gi, '') || 'misc'
  const dir = join(mediaRoot(), safe)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/** Must be called BEFORE app.whenReady(). */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

/** Must be called AFTER app is ready. Serves gwmedia://<kind>/<file> from app media dir. */
export function registerMediaProtocol(): void {
  protocol.handle(SCHEME, (request) => {
    const url = new URL(request.url)
    // gwmedia://kind/file  -> host=kind, pathname=/file
    const kind = url.hostname.replace(/[^a-z0-9_-]/gi, '')
    const file = basename(decodeURIComponent(url.pathname))
    const filePath = join(mediaRoot(), kind, file)
    if (!filePath.startsWith(mediaRoot()) || !existsSync(filePath)) {
      return new Response('Not found', { status: 404 })
    }
    return net.fetch(pathToFileURL(filePath).toString())
  })
}

function mediaUrl(kind: string, file: string): string {
  return `${SCHEME}://${kind}/${file}`
}

/** Copy an existing image file into app media; returns a gwmedia:// url. */
export function importImageFile(kind: string, sourcePath: string): string {
  const ext = (extname(sourcePath) || '.png').toLowerCase()
  const file = `${randomUUID()}${ext}`
  copyFileSync(sourcePath, join(kindDir(kind), file))
  return mediaUrl(kind, file)
}

/** Persist a data URL (data:image/png;base64,...) into app media; returns a gwmedia:// url. */
export function saveDataUrl(kind: string, dataUrl: string): string {
  const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl)
  if (!m) throw new Error('Unsupported data URL')
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1].replace(/[^a-z0-9]/gi, '') || 'png'
  const file = `${randomUUID()}.${ext}`
  writeFileSync(join(kindDir(kind), file), Buffer.from(m[2], 'base64'))
  return mediaUrl(kind, file)
}

/** Resolve a gwmedia:// url back to an absolute file path (for export). */
export function resolveMediaPath(url: string): string | null {
  if (!url.startsWith(`${SCHEME}://`)) return null
  const u = new URL(url)
  const kind = u.hostname.replace(/[^a-z0-9_-]/gi, '')
  const file = basename(decodeURIComponent(u.pathname))
  const p = join(mediaRoot(), kind, file)
  return existsSync(p) ? p : null
}

export function readMedia(url: string): Buffer | null {
  const p = resolveMediaPath(url)
  return p ? readFileSync(p) : null
}

/** Download an image from a URL into app media; returns a gwmedia:// url (or null). */
export async function importImageFromUrl(kind: string, url: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(url)) return null
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 GhostWire' } })
  if (!res.ok) return null
  const ct = res.headers.get('content-type') ?? ''
  const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : ct.includes('gif') ? 'gif' : 'jpg'
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length === 0) return null
  const file = `${randomUUID()}.${ext}`
  writeFileSync(join(kindDir(kind), file), buf)
  return mediaUrl(kind, file)
}

export async function pickImage(kind: string): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow()
  const res = await dialog.showOpenDialog(win!, {
    title: 'Select an image',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }]
  })
  if (res.canceled || !res.filePaths[0]) return null
  return importImageFile(kind, res.filePaths[0])
}
