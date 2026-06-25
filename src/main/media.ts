import { app, protocol, net, dialog, BrowserWindow, nativeImage } from 'electron'
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

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

/** Download an image from a URL, guarding on content-type so we never treat an
 *  HTML error page as an image. Returns the raw bytes + a file extension. */
async function downloadImage(url: string): Promise<{ buf: Buffer; ext: string } | null> {
  if (!/^https?:\/\//i.test(url)) return null
  const res = await fetch(url, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'image/avif,image/webp,image/png,image/*,*/*' }
  })
  if (!res.ok) return null
  const ct = (res.headers.get('content-type') ?? '').toLowerCase()
  if (!ct.startsWith('image/')) return null
  const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : ct.includes('gif') ? 'gif' : 'jpg'
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 256) return null
  return { buf, ext }
}

function saveBuffer(kind: string, buf: Buffer, ext: string): string {
  const file = `${randomUUID()}.${ext}`
  writeFileSync(join(kindDir(kind), file), buf)
  return mediaUrl(kind, file)
}

/** Download an image from a URL into app media; returns a gwmedia:// url (or null). */
export async function importImageFromUrl(kind: string, url: string): Promise<string | null> {
  const got = await downloadImage(url)
  return got ? saveBuffer(kind, got.buf, got.ext) : null
}

/** Trim the bottom strip off an image (where this-person-does-not-exist.com
 *  stamps its "thispersondoesnotexist.com" watermark). Falls back to the
 *  original bytes if decoding fails. Re-encodes as PNG. */
function trimWatermark(buf: Buffer, fraction = 0.07): { buf: Buffer; ext: string } {
  try {
    const img = nativeImage.createFromBuffer(buf)
    const { width, height } = img.getSize()
    if (width > 0 && height > 0) {
      const cropped = img.crop({ x: 0, y: 0, width, height: Math.max(1, Math.round(height * (1 - fraction))) })
      const png = cropped.toPNG()
      if (png.length > 256) return { buf: png, ext: 'png' }
    }
  } catch {
    /* fall through */
  }
  return { buf, ext: 'jpg' }
}

/** Fetch a random AI-generated face for a persona avatar.
 *  Primary: thispersondoesnotexist.com (clean, no watermark).
 *  Fallback: this-person-does-not-exist.com (watermark cropped off).
 *  Last resort: pravatar (stock portrait). */
export async function fetchAvatar(): Promise<string | null> {
  // 1) Clean StyleGAN source — no watermark, so no crop needed.
  try {
    const clean = await importImageFromUrl('avatars', `https://thispersondoesnotexist.com/?${Date.now()}`)
    if (clean) return clean
  } catch {
    /* try next */
  }

  // 2) API source that returns a watermarked image — crop the bottom strip.
  try {
    const meta = await fetch(
      'https://this-person-does-not-exist.com/new?new=1&gender=all&age=all&etnic=all',
      { headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' } }
    )
    if (meta.ok) {
      const j = (await meta.json()) as { src?: string }
      if (j.src) {
        const got = await downloadImage(`https://this-person-does-not-exist.com${j.src}`)
        if (got) {
          const trimmed = trimWatermark(got.buf)
          return saveBuffer('avatars', trimmed.buf, trimmed.ext)
        }
      }
    }
  } catch {
    /* fall through to fallback */
  }

  // 3) Reliable stock-portrait fallback.
  return importImageFromUrl('avatars', `https://i.pravatar.cc/512?u=${randomUUID()}`)
}

/** Copy a stored gwmedia image to a user-chosen file (for uploading elsewhere). */
export function copyMediaToPath(mediaUrl: string, destPath: string): boolean {
  const src = resolveMediaPath(mediaUrl)
  if (!src) return false
  copyFileSync(src, destPath)
  return true
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
