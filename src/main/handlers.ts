import { ipcMain, dialog, BrowserWindow, clipboard, nativeImage, app, net } from 'electron'
import { randomUUID, createHash } from 'crypto'
import { existsSync, mkdirSync, writeFileSync, copyFileSync, unlinkSync, readFileSync } from 'fs'
import { join, dirname, basename } from 'path'
import { all, get, run, encryptionAvailable } from './db'
import { exportAllNotes, writeNote } from './export'
import exifr from 'exifr'
import { pickImage, saveDataUrl, resolveMediaPath, importImageFromUrl, readMedia, fetchAvatar, copyMediaToPath } from './media'
import { testAllTools } from './toolcheck'
import { testApiKey } from './apitest'
import { createMailbox, listMessages, getMessage } from './mail'
import { buildHtmlReport, buildPrintReport, buildDocxHtml, type ReportData } from './report'
import HTMLtoDOCX from 'html-to-docx'
import { openInAppTabs } from './browserbridge'
import { ocrImage } from './ocr'
import { applyPersonaProxies } from './vpn'
import type {
  AppSettings,
  Board,
  EntityEdge,
  EntityNode,
  Evidence,
  GeoResult,
  Note,
  Persona,
  Project,
  ToolLink
} from '../shared/types'

const now = (): number => Date.now()

/** Append an entry to an investigation's activity log. */
function logActivity(projectId: string | null | undefined, type: string, message: string): void {
  if (!projectId) return
  run('INSERT INTO activity (id,projectId,type,message,at) VALUES (?,?,?,?,?)', [
    randomUUID(),
    projectId,
    type,
    message,
    now()
  ])
}
const j = (v: unknown): string => JSON.stringify(v ?? null)
const pj = <T>(s: unknown, fallback: T): T => {
  try {
    return s ? (JSON.parse(String(s)) as T) : fallback
  } catch {
    return fallback
  }
}

// ---------- mappers ----------
function mapPersona(r: Record<string, unknown>): Persona {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    handle: String(r.handle ?? ''),
    status: (r.status as Persona['status']) ?? 'draft',
    projectId: (r.projectId as string) ?? null,
    avatarPath: (r.avatarPath as string) ?? null,
    bio: (r.bio as string) ?? '',
    gender: (r.gender as string) ?? '',
    birthdate: (r.birthdate as string) ?? '',
    location: (r.location as string) ?? '',
    nationality: (r.nationality as string) ?? '',
    email: (r.email as string) ?? '',
    phone: (r.phone as string) ?? '',
    occupation: (r.occupation as string) ?? '',
    backstory: (r.backstory as string) ?? '',
    accounts: pj(r.accounts, []),
    tags: pj(r.tags, []),
    mailbox: r.mailbox ? pj(r.mailbox, null) : null,
    partition: String(r.partition),
    vpnConfigId: (r.vpnConfigId as string) ?? null,
    createdAt: Number(r.createdAt),
    updatedAt: Number(r.updatedAt)
  }
}

function mapNote(r: Record<string, unknown>): Note {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    body: String(r.body ?? ''),
    folder: String(r.folder ?? 'Inbox'),
    projectId: (r.projectId as string) ?? null,
    tags: pj(r.tags, []),
    pinned: Number(r.pinned) === 1,
    createdAt: Number(r.createdAt),
    updatedAt: Number(r.updatedAt)
  }
}

function mapBoard(r: Record<string, unknown>): Board {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    description: (r.description as string) ?? '',
    projectId: (r.projectId as string) ?? null,
    createdAt: Number(r.createdAt),
    updatedAt: Number(r.updatedAt)
  }
}

function mapProject(r: Record<string, unknown>): Project {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    type: (r.type as Project['type']) ?? 'person',
    subject: String(r.subject ?? ''),
    status: (r.status as Project['status']) ?? 'active',
    dataPoints: pj(r.dataPoints, []),
    known: String(r.known ?? ''),
    objectives: String(r.objectives ?? ''),
    timezone: (r.timezone as string) ?? '',
    createdAt: Number(r.createdAt),
    updatedAt: Number(r.updatedAt)
  }
}

function mapNode(r: Record<string, unknown>): EntityNode {
  return {
    id: String(r.id),
    boardId: String(r.boardId),
    type: r.type as EntityNode['type'],
    label: String(r.label ?? ''),
    props: pj(r.props, {}),
    notes: (r.notes as string) ?? '',
    x: Number(r.x),
    y: Number(r.y),
    createdAt: Number(r.createdAt)
  }
}

function mapEdge(r: Record<string, unknown>): EntityEdge {
  return {
    id: String(r.id),
    boardId: String(r.boardId),
    source: String(r.source),
    target: String(r.target),
    label: (r.label as string) ?? '',
    createdAt: Number(r.createdAt)
  }
}

function mapTool(r: Record<string, unknown>): ToolLink {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    url: String(r.url ?? ''),
    category: String(r.category ?? 'General'),
    description: (r.description as string) ?? '',
    builtin: Number(r.builtin) === 1,
    sortOrder: Number(r.sortOrder ?? 0),
    openMode: (r.openMode as 'embed' | 'external') ?? 'embed',
    health: (r.health as ToolLink['health']) ?? null,
    checkedAt: r.checkedAt != null ? Number(r.checkedAt) : null
  }
}

function mapEvidence(r: Record<string, unknown>): Evidence {
  return {
    id: String(r.id),
    projectId: (r.projectId as string) ?? null,
    kind: (r.kind as Evidence['kind']) ?? 'screenshot',
    path: String(r.path),
    sourceUrl: (r.sourceUrl as string) ?? '',
    title: (r.title as string) ?? '',
    sha256: String(r.sha256 ?? ''),
    capturedAt: Number(r.capturedAt),
    note: (r.note as string) ?? '',
    ocr: (r.ocr as string) ?? '',
    geoLat: r.geoLat != null ? Number(r.geoLat) : null,
    geoLng: r.geoLng != null ? Number(r.geoLng) : null,
    geoLabel: (r.geoLabel as string) ?? ''
  }
}

/** Build a Markdown investigation report and copy referenced evidence next to it. */
const REPORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Day Month Year with 24h time + timezone — e.g. "24 Jun 2026, 14:32:07 (UTC-04:00)". */
function fmtReportDate(d: Date): string {
  if (isNaN(d.getTime())) return ''
  const p = (n: number): string => String(n).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const tz = `UTC${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`
  return `${d.getDate()} ${REPORT_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} (${tz})`
}

function buildReport(
  project: Project,
  evidence: Evidence[],
  contents: { personas: Persona[]; notes: Note[]; boards: Board[] },
  evidenceDir: string
): string {
  const L: string[] = []
  L.push(`# Investigation report — ${project.name}`, '')
  L.push(`- **Type:** ${project.type}`)
  if (project.subject) L.push(`- **Subject:** ${project.subject}`)
  L.push(`- **Status:** ${project.status}`)
  L.push(`- **Generated:** ${fmtReportDate(new Date())}`, '')

  if (project.objectives) L.push('## Objectives', '', project.objectives, '')
  if (project.known) L.push('## Background / notes', '', project.known, '')

  if (project.dataPoints?.length) {
    L.push('## Known information', '', '| Type | Value | Note |', '| --- | --- | --- |')
    for (const d of project.dataPoints) L.push(`| ${d.type} | ${d.value} | ${d.note ?? ''} |`)
    L.push('')
  }

  if (evidence.length) {
    L.push('## Evidence', '')
    if (!existsSync(evidenceDir)) mkdirSync(evidenceDir, { recursive: true })
    for (const e of evidence) {
      const src = resolveMediaPath(e.path)
      let rel = ''
      if (src) {
        const fname = basename(src)
        copyFileSync(src, join(evidenceDir, fname))
        rel = `evidence/${fname}`
      }
      L.push(`### ${e.title || e.sourceUrl || e.id}`)
      if (e.sourceUrl) L.push(`- **URL:** ${e.sourceUrl}`)
      L.push(`- **Captured:** ${fmtReportDate(new Date(e.capturedAt))}`)
      if (e.sha256) L.push(`- **SHA-256:** \`${e.sha256}\``)
      if (rel) L.push('', `![evidence](${rel})`)
      L.push('')
    }
  }

  const names = (arr: { name?: string; title?: string }[]): string =>
    arr.map((x) => x.name ?? x.title).filter(Boolean).join(', ') || '—'
  L.push('## Linked items', '')
  L.push(`- **Personas:** ${names(contents.personas)}`)
  L.push(`- **Notes:** ${names(contents.notes)}`)
  L.push(`- **Link charts:** ${names(contents.boards)}`, '')
  L.push('---', '', '_Generated by GhostWire._')
  return L.join('\n')
}

// ---------- settings ----------
function parseSetting(v: string): unknown {
  try {
    return JSON.parse(v)
  } catch {
    return v // legacy plain-string values (e.g. an older vaultPath)
  }
}

export function getSettings(): AppSettings {
  const rows = all<{ key: string; value: string }>('SELECT key, value FROM settings')
  const out: Record<string, unknown> = {}
  for (const row of rows) out[row.key] = parseSetting(row.value)
  // Defaults
  if (out.showTraining === undefined) out.showTraining = true
  if (!out.theme || out.theme === 'cyan') out.theme = 'midnight'
  if (!out.apiKeys || typeof out.apiKeys !== 'object') out.apiKeys = {}
  return out as AppSettings
}

export function putSetting(key: string, value: unknown): void {
  run('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [
    key,
    JSON.stringify(value)
  ])
}

/** Save an image (http(s) URL or data:image URL) into the evidence locker with a
 *  SHA-256 hash. Used by the renderer and the in-browser right-click menu. */
export async function addEvidenceFromUrl(url: string, projectId: string | null): Promise<Evidence> {
  let path: string | null
  let sourceUrl = url
  if (/^data:image\//i.test(url)) {
    path = saveDataUrl('evidence', url)
    sourceUrl = ''
  } else {
    path = await importImageFromUrl('evidence', url)
  }
  if (!path) throw new Error('Could not save that image')
  const buf = readMedia(path)
  const sha = buf ? createHash('sha256').update(buf).digest('hex') : ''
  const id = randomUUID()
  run(
    'INSERT INTO evidence (id,projectId,kind,path,sourceUrl,title,sha256,capturedAt,note) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, projectId ?? null, 'image', path, sourceUrl, '', sha, now(), '']
  )
  logActivity(projectId, 'evidence', `Added image${sourceUrl ? ` from ${sourceUrl}` : ''}`)
  return mapEvidence(get('SELECT * FROM evidence WHERE id = ?', [id])!)
}

export interface ExifSummary {
  gps?: { lat: number; lng: number }
  make?: string
  model?: string
  software?: string
  dateTime?: string
  fileSize?: number
  all?: Record<string, string>
}

/** Parse the full tag set (EXIF + GPS + IPTC + XMP) from an image buffer. */
export async function readExif(buf: Buffer): Promise<ExifSummary> {
  const fmt = (v: unknown): string => {
    if (v == null) return ''
    if (v instanceof Date) return v.toISOString()
    if (Array.isArray(v)) return v.join(', ')
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }
  try {
    const data = (await exifr.parse(buf, {
      tiff: true,
      exif: true,
      gps: true,
      iptc: true,
      xmp: true,
      translateKeys: true,
      translateValues: true,
      reviveValues: true
    })) as Record<string, unknown> | undefined
    const all: Record<string, string> = {}
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        if (k === 'latitude' || k === 'longitude') continue
        const s = fmt(v)
        if (s) all[k] = s.length > 300 ? s.slice(0, 300) + '…' : s
      }
    }
    const lat = data?.latitude as number | undefined
    const lng = data?.longitude as number | undefined
    return {
      gps: typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : undefined,
      make: data?.Make as string | undefined,
      model: data?.Model as string | undefined,
      software: data?.Software as string | undefined,
      dateTime: data?.DateTimeOriginal ? String(data.DateTimeOriginal) : undefined,
      fileSize: buf.length,
      all
    }
  } catch {
    return { fileSize: buf.length, all: {} }
  }
}

/** Gather everything for a full case report, with evidence images embedded. */
async function gatherReport(id: string): Promise<ReportData | null> {
  const pr = get('SELECT * FROM projects WHERE id = ?', [id])
  if (!pr) return null
  const project = mapProject(pr)
  const evidence = await Promise.all(
    all('SELECT * FROM evidence WHERE projectId = ? ORDER BY capturedAt DESC', [id])
      .map(mapEvidence)
      .map(async (e) => {
        const buf = e.kind !== 'file' ? readMedia(e.path) : null
        const ext = (e.path.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const mime =
          ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
        const exif = buf ? await readExif(buf) : undefined
        return { ...e, dataUri: buf ? `data:${mime};base64,${buf.toString('base64')}` : null, exif }
      })
  )
  const notes = all('SELECT * FROM notes WHERE projectId = ? ORDER BY updatedAt DESC', [id]).map(mapNote)
  const activity = all('SELECT * FROM activity WHERE projectId = ? ORDER BY at ASC', [id]).map((a) => ({
    id: String((a as Record<string, unknown>).id),
    projectId: id,
    type: String((a as Record<string, unknown>).type ?? ''),
    message: String((a as Record<string, unknown>).message ?? ''),
    at: Number((a as Record<string, unknown>).at)
  }))
  const personas = all('SELECT * FROM personas WHERE projectId = ?', [id]).map(mapPersona)
  const boards = all('SELECT * FROM boards WHERE projectId = ?', [id]).map(mapBoard)
  const graphs = boards.map((b) => ({
    board: b,
    entities: all('SELECT * FROM entities WHERE boardId = ?', [b.id]).map(mapNode).map((e) => {
      // Inline node thumbnails as data URIs so the report's chart can show them offline.
      const img = e.props?.image
      if (typeof img === 'string' && img) {
        if (img.startsWith('data:')) return e
        if (img.startsWith('gwmedia://')) {
          const buf = readMedia(img)
          if (buf) {
            const ext = (img.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
            const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
            return { ...e, props: { ...e.props, image: `data:${mime};base64,${buf.toString('base64')}` } }
          }
        }
        return { ...e, props: { ...e.props, image: '' } } // http/unresolvable — don't reference it
      }
      return e
    }),
    edges: all('SELECT * FROM edges WHERE boardId = ?', [b.id]).map(mapEdge)
  }))
  return { project, evidence, notes, activity, personas, graphs, logo: reportLogo() }
}

/** The GhostWire app icon as a data URI, for the report header (best-effort). */
let _logoCache: string | undefined
function reportLogo(): string | undefined {
  if (_logoCache !== undefined) return _logoCache || undefined
  for (const p of [join(app.getAppPath(), 'icon.png'), join(process.resourcesPath, 'icon.png'), join(__dirname, '../../icon.png')]) {
    try {
      if (existsSync(p)) {
        _logoCache = `data:image/png;base64,${readFileSync(p).toString('base64')}`
        return _logoCache
      }
    } catch {
      /* try next */
    }
  }
  _logoCache = ''
  return undefined
}

export function registerHandlers(): void {
  // ===== Projects / Investigations =====
  ipcMain.handle('projects:list', () =>
    all('SELECT * FROM projects ORDER BY updatedAt DESC').map(mapProject)
  )
  ipcMain.handle('projects:get', (_e, id: string) => {
    const r = get('SELECT * FROM projects WHERE id = ?', [id])
    return r ? mapProject(r) : null
  })
  ipcMain.handle('projects:save', (_e, p: Partial<Project>) => {
    const t = now()
    const existing = p.id ? get('SELECT * FROM projects WHERE id = ?', [p.id]) : null
    const id = p.id ?? randomUUID()
    run(
      `INSERT INTO projects (id,name,type,subject,status,dataPoints,known,objectives,timezone,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, type=excluded.type, subject=excluded.subject, status=excluded.status,
         dataPoints=excluded.dataPoints, known=excluded.known, objectives=excluded.objectives,
         timezone=excluded.timezone, updatedAt=excluded.updatedAt`,
      [
        id,
        p.name ?? 'Untitled investigation',
        p.type ?? 'person',
        p.subject ?? '',
        p.status ?? 'active',
        j(p.dataPoints ?? []),
        p.known ?? '',
        p.objectives ?? '',
        p.timezone ?? '',
        existing ? Number((existing as Record<string, unknown>).createdAt) : t,
        t
      ]
    )
    return mapProject(get('SELECT * FROM projects WHERE id = ?', [id])!)
  })
  ipcMain.handle('projects:remove', (_e, id: string) => {
    // Unlink children rather than deleting the user's data.
    run('UPDATE personas SET projectId = NULL WHERE projectId = ?', [id])
    run('UPDATE notes SET projectId = NULL WHERE projectId = ?', [id])
    run('UPDATE boards SET projectId = NULL WHERE projectId = ?', [id])
    run('DELETE FROM projects WHERE id = ?', [id])
  })
  ipcMain.handle('projects:counts', () => {
    const out: Record<string, { personas: number; notes: number; boards: number }> = {}
    const ensure = (pid: string): void => {
      if (!out[pid]) out[pid] = { personas: 0, notes: 0, boards: 0 }
    }
    for (const r of all<{ projectId: string; c: number }>(
      'SELECT projectId, COUNT(*) AS c FROM personas WHERE projectId IS NOT NULL GROUP BY projectId'
    )) {
      ensure(r.projectId)
      out[r.projectId].personas = Number(r.c)
    }
    for (const r of all<{ projectId: string; c: number }>(
      'SELECT projectId, COUNT(*) AS c FROM notes WHERE projectId IS NOT NULL GROUP BY projectId'
    )) {
      ensure(r.projectId)
      out[r.projectId].notes = Number(r.c)
    }
    for (const r of all<{ projectId: string; c: number }>(
      'SELECT projectId, COUNT(*) AS c FROM boards WHERE projectId IS NOT NULL GROUP BY projectId'
    )) {
      ensure(r.projectId)
      out[r.projectId].boards = Number(r.c)
    }
    return out
  })
  ipcMain.handle('projects:contents', (_e, id: string) => ({
    personas: all('SELECT * FROM personas WHERE projectId = ? ORDER BY updatedAt DESC', [id]).map(mapPersona),
    notes: all('SELECT * FROM notes WHERE projectId = ? ORDER BY updatedAt DESC', [id]).map(mapNote),
    boards: all('SELECT * FROM boards WHERE projectId = ? ORDER BY updatedAt DESC', [id]).map(mapBoard)
  }))
  ipcMain.handle('projects:exportReport', async (_e, id: string) => {
    const pr = get('SELECT * FROM projects WHERE id = ?', [id])
    if (!pr) return null
    const project = mapProject(pr)
    const evidence = all('SELECT * FROM evidence WHERE projectId = ? ORDER BY capturedAt DESC', [id]).map(mapEvidence)
    const contents = {
      personas: all('SELECT * FROM personas WHERE projectId = ?', [id]).map(mapPersona),
      notes: all('SELECT * FROM notes WHERE projectId = ?', [id]).map(mapNote),
      boards: all('SELECT * FROM boards WHERE projectId = ?', [id]).map(mapBoard)
    }
    const safe = project.name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 100) || 'investigation'
    const { vaultPath } = getSettings()
    let dir: string
    if (vaultPath) {
      dir = join(vaultPath, 'GhostWire', 'reports')
    } else {
      const win = BrowserWindow.getFocusedWindow()
      const res = await dialog.showSaveDialog(win!, {
        title: 'Save investigation report',
        defaultPath: `${safe}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      })
      if (res.canceled || !res.filePath) return null
      dir = dirname(res.filePath)
    }
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const file = join(dir, `${safe}.md`)
    writeFileSync(file, buildReport(project, evidence, contents, join(dir, 'evidence')), 'utf-8')
    logActivity(id, 'report', 'Exported investigation report (Markdown)')
    return file
  })

  ipcMain.handle('projects:exportReportHtml', async (_e, id: string) => {
    const data = await gatherReport(id)
    if (!data) return null
    const safe = data.project.name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 100) || 'investigation'
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showSaveDialog(win!, {
      title: 'Save HTML report',
      defaultPath: `${safe}.html`,
      filters: [{ name: 'HTML', extensions: ['html'] }]
    })
    if (res.canceled || !res.filePath) return null
    writeFileSync(res.filePath, buildHtmlReport(data), 'utf-8')
    logActivity(id, 'report', 'Exported HTML report')
    return res.filePath
  })

  ipcMain.handle('projects:exportReportPdf', async (_e, id: string) => {
    const data = await gatherReport(id)
    if (!data) return null
    const safe = data.project.name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 100) || 'investigation'
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showSaveDialog(win!, {
      title: 'Save PDF report',
      defaultPath: `${safe}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (res.canceled || !res.filePath) return null
    const tmp = join(app.getPath('temp'), `gw-report-${randomUUID()}.html`)
    writeFileSync(tmp, buildPrintReport(data), 'utf-8')
    const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } })
    try {
      await w.loadFile(tmp)
      const pdf = await w.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
      writeFileSync(res.filePath, pdf)
    } finally {
      w.destroy()
      try {
        unlinkSync(tmp)
      } catch {
        /* temp cleanup best-effort */
      }
    }
    logActivity(id, 'report', 'Exported PDF report')
    return res.filePath
  })

  ipcMain.handle('projects:exportReportDocx', async (_e, id: string) => {
    const data = await gatherReport(id)
    if (!data) return null
    const safe = data.project.name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 100) || 'investigation'
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showSaveDialog(win!, {
      title: 'Save Word report',
      defaultPath: `${safe}.docx`,
      filters: [{ name: 'Word document', extensions: ['docx'] }]
    })
    if (res.canceled || !res.filePath) return null
    const buf = (await HTMLtoDOCX(buildDocxHtml(data), null, {
      title: `${data.project.name} — Investigation report`,
      margins: { top: 720, right: 720, bottom: 720, left: 720 }
    })) as Buffer | ArrayBuffer
    writeFileSync(res.filePath, Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer))
    logActivity(id, 'report', 'Exported Word report (.docx)')
    return res.filePath
  })

  // ===== Evidence =====
  ipcMain.handle('evidence:capture', (_e, payload: {
    dataUrl: string
    sourceUrl?: string
    title?: string
    projectId?: string | null
    kind?: Evidence['kind']
  }) => {
    const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.*)$/.exec(payload.dataUrl)
    if (!m) throw new Error('Unsupported image data')
    const sha = createHash('sha256').update(Buffer.from(m[2], 'base64')).digest('hex')
    const path = saveDataUrl('evidence', payload.dataUrl)
    const id = randomUUID()
    run(
      'INSERT INTO evidence (id,projectId,kind,path,sourceUrl,title,sha256,capturedAt,note) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, payload.projectId ?? null, payload.kind ?? 'screenshot', path, payload.sourceUrl ?? '', payload.title ?? '', sha, now(), '']
    )
    logActivity(payload.projectId, 'evidence', `Captured evidence: ${payload.title || payload.sourceUrl || 'screenshot'}`)
    return mapEvidence(get('SELECT * FROM evidence WHERE id = ?', [id])!)
  })
  ipcMain.handle('evidence:list', (_e, projectId: string | null) => {
    const rows = projectId
      ? all('SELECT * FROM evidence WHERE projectId = ? ORDER BY capturedAt DESC', [projectId])
      : all('SELECT * FROM evidence WHERE projectId IS NULL ORDER BY capturedAt DESC')
    return rows.map(mapEvidence)
  })
  ipcMain.handle('evidence:remove', (_e, id: string) => {
    run('DELETE FROM evidence WHERE id = ?', [id])
  })
  ipcMain.handle('evidence:setNote', (_e, id: string, note: string) => {
    run('UPDATE evidence SET note = ? WHERE id = ?', [String(note ?? ''), id])
  })
  ipcMain.handle('evidence:setOcr', (_e, id: string, ocr: string) => {
    run('UPDATE evidence SET ocr = ? WHERE id = ?', [String(ocr ?? ''), id])
  })
  // Run offline OCR on a stored evidence image; returns the extracted text.
  ipcMain.handle('evidence:ocr', async (_e, id: string) => {
    const r = get('SELECT path FROM evidence WHERE id = ?', [id])
    if (!r) return ''
    const buf = readMedia(String((r as Record<string, unknown>).path))
    if (!buf) return ''
    return ocrImage(buf)
  })
  // Download an image from a URL straight into the evidence locker (with SHA-256).
  ipcMain.handle('evidence:fromUrl', (_e, url: string, projectId: string | null) => addEvidenceFromUrl(url, projectId))
  // Assign / clear a map location for an exhibit (EXIF, AI guess, or set by hand).
  ipcMain.handle('evidence:setGeo', (_e, id: string, lat: number | null, lng: number | null, label?: string) => {
    run('UPDATE evidence SET geoLat = ?, geoLng = ?, geoLabel = ? WHERE id = ?', [
      lat == null ? null : Number(lat),
      lng == null ? null : Number(lng),
      String(label ?? ''),
      id
    ])
  })
  // Copy a stored image to the OS clipboard so it can be pasted into a reverse-image engine.
  ipcMain.handle('evidence:copyImage', (_e, id: string) => {
    const r = get('SELECT path FROM evidence WHERE id = ?', [id])
    if (!r) return false
    const buf = readMedia(String((r as Record<string, unknown>).path))
    if (!buf) return false
    const img = nativeImage.createFromBuffer(buf)
    if (img.isEmpty()) return false
    clipboard.writeImage(img)
    return true
  })
  // Re-hash a stored exhibit and compare it to the hash recorded at capture — proves integrity.
  ipcMain.handle('evidence:verify', (_e, id: string) => {
    const r = get('SELECT path, sha256, capturedAt FROM evidence WHERE id = ?', [id]) as
      | { path: string; sha256: string; capturedAt: number }
      | undefined
    if (!r) return { status: 'missing', sizeBytes: 0, storedHash: '', currentHash: '' }
    const buf = readMedia(r.path)
    if (!buf) return { status: 'missing', sizeBytes: 0, storedHash: r.sha256 ?? '', currentHash: '' }
    const current = createHash('sha256').update(buf).digest('hex')
    const stored = r.sha256 ?? ''
    if (!stored) {
      // Legacy exhibit captured before hashing — backfill it now and treat as the baseline.
      run('UPDATE evidence SET sha256 = ? WHERE id = ?', [current, id])
      return { status: 'recorded', sizeBytes: buf.length, storedHash: current, currentHash: current }
    }
    return {
      status: current === stored ? 'verified' : 'altered',
      sizeBytes: buf.length,
      storedHash: stored,
      currentHash: current
    }
  })

  // ===== Personas =====
  ipcMain.handle('personas:list', () =>
    all('SELECT * FROM personas ORDER BY updatedAt DESC').map(mapPersona)
  )
  ipcMain.handle('personas:get', (_e, id: string) => {
    const r = get('SELECT * FROM personas WHERE id = ?', [id])
    return r ? mapPersona(r) : null
  })
  ipcMain.handle('personas:save', (_e, p: Partial<Persona>) => {
    const t = now()
    const existing = p.id ? get('SELECT * FROM personas WHERE id = ?', [p.id]) : null
    const id = p.id ?? randomUUID()
    const partition = existing
      ? String((existing as Record<string, unknown>).partition)
      : `persist:persona_${id}`
    run(
      `INSERT INTO personas (id,name,handle,status,projectId,avatarPath,bio,gender,birthdate,location,nationality,email,phone,occupation,backstory,accounts,tags,mailbox,partition,vpnConfigId,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, handle=excluded.handle, status=excluded.status, projectId=excluded.projectId, avatarPath=excluded.avatarPath,
         bio=excluded.bio, gender=excluded.gender, birthdate=excluded.birthdate, location=excluded.location,
         nationality=excluded.nationality, email=excluded.email, phone=excluded.phone, occupation=excluded.occupation,
         backstory=excluded.backstory, accounts=excluded.accounts, tags=excluded.tags, mailbox=excluded.mailbox,
         vpnConfigId=excluded.vpnConfigId, updatedAt=excluded.updatedAt`,
      [
        id,
        p.name ?? 'Unnamed persona',
        p.handle ?? '',
        p.status ?? 'draft',
        p.projectId ?? null,
        p.avatarPath ?? null,
        p.bio ?? '',
        p.gender ?? '',
        p.birthdate ?? '',
        p.location ?? '',
        p.nationality ?? '',
        p.email ?? '',
        p.phone ?? '',
        p.occupation ?? '',
        p.backstory ?? '',
        j(p.accounts ?? []),
        j(p.tags ?? []),
        p.mailbox ? j(p.mailbox) : null,
        partition,
        p.vpnConfigId ?? null,
        existing ? Number((existing as Record<string, unknown>).createdAt) : t,
        t
      ]
    )
    // Pin this persona's browser session to its (possibly changed) exit country.
    applyPersonaProxies()
    return mapPersona(get('SELECT * FROM personas WHERE id = ?', [id])!)
  })
  ipcMain.handle('personas:remove', (_e, id: string) => {
    run('DELETE FROM personas WHERE id = ?', [id])
  })

  // ===== Notes =====
  ipcMain.handle('notes:list', () =>
    all('SELECT * FROM notes ORDER BY pinned DESC, updatedAt DESC').map(mapNote)
  )
  ipcMain.handle('notes:get', (_e, id: string) => {
    const r = get('SELECT * FROM notes WHERE id = ?', [id])
    return r ? mapNote(r) : null
  })
  ipcMain.handle('notes:save', (_e, n: Partial<Note>) => {
    const t = now()
    const existing = n.id ? get('SELECT * FROM notes WHERE id = ?', [n.id]) : null
    const id = n.id ?? randomUUID()
    run(
      `INSERT INTO notes (id,title,body,folder,projectId,tags,pinned,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title, body=excluded.body, folder=excluded.folder, projectId=excluded.projectId,
         tags=excluded.tags, pinned=excluded.pinned, updatedAt=excluded.updatedAt`,
      [
        id,
        n.title ?? 'Untitled',
        n.body ?? '',
        n.folder ?? 'Inbox',
        n.projectId ?? null,
        j(n.tags ?? []),
        n.pinned ? 1 : 0,
        existing ? Number((existing as Record<string, unknown>).createdAt) : t,
        t
      ]
    )
    return mapNote(get('SELECT * FROM notes WHERE id = ?', [id])!)
  })
  ipcMain.handle('notes:remove', (_e, id: string) => {
    run('DELETE FROM notes WHERE id = ?', [id])
  })
  ipcMain.handle('notes:exportAll', async () => {
    const { vaultPath } = getSettings()
    if (!vaultPath) return null
    const notes = all('SELECT * FROM notes').map(mapNote)
    return exportAllNotes(vaultPath, notes)
  })
  ipcMain.handle('notes:exportOne', async (_e, id: string) => {
    const { vaultPath } = getSettings()
    if (!vaultPath) return null
    const r = get('SELECT * FROM notes WHERE id = ?', [id])
    if (!r) return null
    return writeNote(vaultPath, mapNote(r))
  })

  // ===== Boards / Graph =====
  ipcMain.handle('boards:list', () =>
    all('SELECT * FROM boards ORDER BY updatedAt DESC').map(mapBoard)
  )
  ipcMain.handle('boards:save', (_e, b: Partial<Board>) => {
    const t = now()
    const existing = b.id ? get('SELECT * FROM boards WHERE id = ?', [b.id]) : null
    const id = b.id ?? randomUUID()
    run(
      `INSERT INTO boards (id,name,description,projectId,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, projectId=excluded.projectId, updatedAt=excluded.updatedAt`,
      [
        id,
        b.name ?? 'Untitled board',
        b.description ?? '',
        b.projectId ?? null,
        existing ? Number((existing as Record<string, unknown>).createdAt) : t,
        t
      ]
    )
    return mapBoard(get('SELECT * FROM boards WHERE id = ?', [id])!)
  })
  ipcMain.handle('boards:remove', (_e, id: string) => {
    run('DELETE FROM entities WHERE boardId = ?', [id])
    run('DELETE FROM edges WHERE boardId = ?', [id])
    run('DELETE FROM boards WHERE id = ?', [id])
  })
  ipcMain.handle('boards:graph', (_e, boardId: string) => ({
    nodes: all('SELECT * FROM entities WHERE boardId = ?', [boardId]).map(mapNode),
    edges: all('SELECT * FROM edges WHERE boardId = ?', [boardId]).map(mapEdge)
  }))
  ipcMain.handle('boards:saveNode', (_e, n: Partial<EntityNode>) => {
    const existing = n.id ? get('SELECT * FROM entities WHERE id = ?', [n.id]) : null
    const id = n.id ?? randomUUID()
    run(
      `INSERT INTO entities (id,boardId,type,label,props,notes,x,y,createdAt)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         type=excluded.type, label=excluded.label, props=excluded.props,
         notes=excluded.notes, x=excluded.x, y=excluded.y`,
      [
        id,
        n.boardId,
        n.type ?? 'custom',
        n.label ?? '',
        j(n.props ?? {}),
        n.notes ?? '',
        n.x ?? 0,
        n.y ?? 0,
        existing ? Number((existing as Record<string, unknown>).createdAt) : now()
      ]
    )
    return mapNode(get('SELECT * FROM entities WHERE id = ?', [id])!)
  })
  ipcMain.handle('boards:removeNode', (_e, id: string) => {
    run('DELETE FROM edges WHERE source = ? OR target = ?', [id, id])
    run('DELETE FROM entities WHERE id = ?', [id])
  })
  ipcMain.handle('boards:saveEdge', (_e, ed: Partial<EntityEdge>) => {
    const id = ed.id ?? randomUUID()
    run(
      `INSERT INTO edges (id,boardId,source,target,label,createdAt)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET label=excluded.label`,
      [id, ed.boardId, ed.source, ed.target, ed.label ?? '', now()]
    )
    return mapEdge(get('SELECT * FROM edges WHERE id = ?', [id])!)
  })
  ipcMain.handle('boards:removeEdge', (_e, id: string) => {
    run('DELETE FROM edges WHERE id = ?', [id])
  })

  // ===== Tools =====
  ipcMain.handle('tools:list', () =>
    all('SELECT * FROM tools ORDER BY category, sortOrder, name').map(mapTool)
  )
  ipcMain.handle('tools:save', (_e, tl: Partial<ToolLink>) => {
    const id = tl.id ?? randomUUID()
    run(
      `INSERT INTO tools (id,name,url,category,description,builtin,sortOrder,openMode)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, url=excluded.url, category=excluded.category,
         description=excluded.description, sortOrder=excluded.sortOrder, openMode=excluded.openMode`,
      [
        id,
        tl.name ?? 'Tool',
        tl.url ?? '',
        tl.category ?? 'General',
        tl.description ?? '',
        tl.builtin ? 1 : 0,
        tl.sortOrder ?? 100,
        tl.openMode ?? 'embed'
      ]
    )
    return mapTool(get('SELECT * FROM tools WHERE id = ?', [id])!)
  })
  ipcMain.handle('tools:remove', (_e, id: string) => {
    run('DELETE FROM tools WHERE id = ?', [id])
  })
  ipcMain.handle('tools:testAll', async (e) => {
    const tools = all('SELECT * FROM tools').map(mapTool)
    const results = await testAllTools(tools, (r, done, total) => {
      const t = now()
      run('UPDATE tools SET health = ?, checkedAt = ? WHERE id = ?', [r.health, t, r.id])
      if (!e.sender.isDestroyed()) e.sender.send('tools:testProgress', { ...r, done, total })
    })
    return results
  })

  // ===== Files / images =====
  ipcMain.handle('files:pickImage', (_e, kind: string) => pickImage(kind))
  ipcMain.handle('files:saveDataUrl', (_e, dataUrl: string, kind: string) => saveDataUrl(kind, dataUrl))
  ipcMain.handle('files:fetchImage', (_e, url: string, kind: string) => importImageFromUrl(kind, url))
  ipcMain.handle('files:randomAvatar', () => fetchAvatar())
  ipcMain.handle('files:saveCopy', async (_e, mediaUrl: string, defaultName: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showSaveDialog(win!, {
      title: 'Save image',
      defaultPath: defaultName,
      filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
    })
    if (res.canceled || !res.filePath) return null
    return copyMediaToPath(mediaUrl, res.filePath) ? res.filePath : null
  })
  ipcMain.handle('files:exportImage', async (_e, dataUrl: string, defaultName: string) => {
    const m = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.*)$/.exec(dataUrl)
    if (!m) throw new Error('Unsupported image data')
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showSaveDialog(win!, {
      title: 'Export image',
      defaultPath: defaultName,
      filters: [{ name: 'PNG', extensions: ['png'] }]
    })
    if (res.canceled || !res.filePath) return null
    writeFileSync(res.filePath, Buffer.from(m[1], 'base64'))
    return res.filePath
  })
  // Return a stored media file as a data URL (used for OCR, which needs raw bytes).
  ipcMain.handle('files:dataUrl', (_e, mediaUrl: string) => {
    const buf = readMedia(mediaUrl)
    if (!buf) return null
    const ext = (mediaUrl.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  })
  ipcMain.handle('files:exif', async (_e, mediaUrl: string) => {
    const buf = readMedia(mediaUrl)
    if (!buf) return {}
    return readExif(buf)
  })

  // ===== Activity log =====
  ipcMain.handle('activity:log', (_e, projectId: string, type: string, message: string) =>
    logActivity(projectId, type, message)
  )
  ipcMain.handle('activity:list', (_e, projectId: string) =>
    all('SELECT * FROM activity WHERE projectId = ? ORDER BY at DESC LIMIT 200', [projectId]).map((r) => ({
      id: String(r.id),
      projectId: String(r.projectId),
      type: String(r.type ?? ''),
      message: String(r.message ?? ''),
      at: Number(r.at)
    }))
  )

  // ===== API key testing =====
  ipcMain.handle('apikeys:test', (_e, id: string, key: string) => testApiKey(id, key))

  // ===== Shell =====
  // Links never leave the app — route to the in-app browser instead of the OS browser.
  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    openInAppTabs([url])
  })

  // ===== Clipboard (the web Clipboard API is unavailable under file://) =====
  ipcMain.handle('clipboard:write', (_e, text: string) => clipboard.writeText(String(text ?? '')))
  // Copy an image (data: URL) to the OS clipboard — used to paste into reverse-image engines.
  ipcMain.handle('clipboard:writeImage', (_e, dataUrl: string) => {
    try {
      const img = nativeImage.createFromDataURL(String(dataUrl ?? ''))
      if (img.isEmpty()) return false
      clipboard.writeImage(img)
      return true
    } catch {
      return false
    }
  })

  // ===== App =====
  ipcMain.handle('app:encryptionStatus', () => encryptionAvailable())

  // ===== Window controls (frameless title bar) =====
  ipcMain.on('win:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.on('win:toggleMaximize', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    if (!w) return
    w.isMaximized() ? w.unmaximize() : w.maximize()
  })
  ipcMain.on('win:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
  ipcMain.handle('win:isMaximized', (e) => BrowserWindow.fromWebContents(e.sender)?.isMaximized() ?? false)

  // ===== Network (for graph transforms / free APIs; bypasses renderer CORS) =====
  // Uses Electron's net.fetch so requests honour the default session's proxy —
  // i.e. the app-wide VPN exit when one is set.
  ipcMain.handle('net:fetchJson', async (_e, url: string, headers?: Record<string, string>) => {
    if (!/^https:\/\//i.test(url)) throw new Error('Only https URLs are allowed')
    const res = await net.fetch(url, {
      headers: { 'User-Agent': 'GhostWire-OSINT', Accept: 'application/json', ...(headers ?? {}) }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  })
  ipcMain.handle('net:httpStatus', async (_e, url: string) => {
    if (!/^https?:\/\//i.test(url)) return 0
    const opts = {
      redirect: 'follow' as const,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
      }
    }
    try {
      let res = await net.fetch(url, { method: 'HEAD', ...opts })
      if (res.status === 405 || res.status === 501) res = await net.fetch(url, { method: 'GET', ...opts })
      return res.status
    } catch {
      return 0
    }
  })

  // ===== Email / phone intelligence =====
  // Gravatar profile by email (md5 of the lowercased address). No key needed.
  ipcMain.handle('intel:gravatar', async (_e, email: string) => {
    const hash = createHash('md5').update(email.trim().toLowerCase()).digest('hex')
    try {
      const res = await net.fetch(`https://gravatar.com/${hash}.json`, { headers: { 'User-Agent': 'GhostWire-OSINT' } })
      if (!res.ok) return { found: false, hash }
      const j = (await res.json()) as { entry?: Record<string, unknown>[] }
      const e = j.entry?.[0]
      if (!e) return { found: false, hash }
      return {
        found: true,
        hash,
        displayName: String(e.displayName ?? e.preferredUsername ?? ''),
        profileUrl: String(e.profileUrl ?? `https://gravatar.com/${hash}`),
        location: String(e.currentLocation ?? ''),
        about: String(e.aboutMe ?? ''),
        accounts: ((e.accounts as Record<string, unknown>[]) ?? []).map((a) => ({
          label: String(a.shortname ?? a.name ?? a.domain ?? 'account'),
          url: String(a.url ?? '')
        })),
        photos: ((e.photos as Record<string, unknown>[]) ?? []).map((p) => String(p.value ?? '')).filter(Boolean)
      }
    } catch {
      return { found: false, hash }
    }
  })

  // Have I Been Pwned breach lookup for an email (requires a paid HIBP key).
  ipcMain.handle('intel:hibp', async (_e, email: string, key: string) => {
    if (!key) return { ok: false, error: 'Add a Have I Been Pwned API key in Settings.' }
    try {
      const res = await net.fetch(
        `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
        { headers: { 'hibp-api-key': key, 'User-Agent': 'GhostWire-OSINT' } }
      )
      if (res.status === 404) return { ok: true, breaches: [] }
      if (res.status === 401) return { ok: false, error: 'HIBP key rejected (401).' }
      if (res.status === 429) return { ok: false, error: 'HIBP rate limit — wait a moment.' }
      if (!res.ok) return { ok: false, error: `HIBP HTTP ${res.status}` }
      const arr = (await res.json()) as Record<string, unknown>[]
      return {
        ok: true,
        breaches: arr.map((b) => ({
          name: String(b.Title ?? b.Name ?? ''),
          date: String(b.BreachDate ?? ''),
          count: Number(b.PwnCount ?? 0),
          classes: ((b.DataClasses as string[]) ?? []).join(', ')
        }))
      }
    } catch (e) {
      return { ok: false, error: String((e as Error)?.message ?? e) }
    }
  })

  // AI geolocation — ask an OpenAI vision model where an evidence image was taken.
  ipcMain.handle('intel:geolocate', async (_e, evidenceId: string): Promise<GeoResult> => {
    const key = getSettings().apiKeys?.openai
    if (!key) throw new Error('Add an OpenAI API key in Settings to use AI geolocation.')
    const r = get('SELECT path FROM evidence WHERE id = ?', [evidenceId]) as { path: string } | undefined
    if (!r) throw new Error('Evidence not found.')
    const buf = readMedia(r.path)
    if (!buf) throw new Error('Image file not found.')
    const ext = (r.path.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
    const dataUri = `data:${mime};base64,${buf.toString('base64')}`
    const instructions =
      'Act as an expert OSINT geolocation analyst (a GeoGuessr world champion). Study the image and infer the most likely real-world location from visual cues only: text/signage and its language & script, license plates, road markings and driving side, utility poles, bollards, architecture, vegetation/climate, terrain, vehicles, and sun position. Give 1–5 ranked candidates, most likely first. ' +
      'Respond with STRICT JSON only, no prose, in this exact shape: ' +
      '{"summary": string, "guesses": [{"place": string, "country": string, "lat": number, "lng": number, "confidence": number, "reasoning": string}]}. ' +
      'confidence is 0-100. lat/lng are approximate decimal degrees for the place (use null if you truly cannot estimate). If the image has no usable geographic cues, return an empty guesses array and say so in summary.'
    const body = {
      model: 'gpt-4o',
      max_tokens: 1000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a precise OSINT geolocation assistant. Output only valid JSON.' },
        {
          role: 'user',
          content: [
            { type: 'text', text: instructions },
            { type: 'image_url', image_url: { url: dataUri } }
          ]
        }
      ]
    }
    const res = await net.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      if (res.status === 401) throw new Error('OpenAI key rejected (401).')
      if (res.status === 429) throw new Error('OpenAI rate limit / quota exceeded (429).')
      throw new Error(`OpenAI HTTP ${res.status}${t ? `: ${t.slice(0, 200)}` : ''}`)
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = j.choices?.[0]?.message?.content ?? '{}'
    let parsed: { summary?: string; guesses?: unknown[] }
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = { summary: content, guesses: [] }
    }
    const num = (v: unknown): number | null => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v))
    const guesses = Array.isArray(parsed.guesses)
      ? parsed.guesses.slice(0, 6).map((g) => {
          const o = g as Record<string, unknown>
          return {
            place: String(o.place ?? o.location ?? '').trim(),
            country: o.country ? String(o.country) : undefined,
            lat: num(o.lat),
            lng: num(o.lng),
            confidence: num(o.confidence) ?? undefined,
            reasoning: o.reasoning ? String(o.reasoning) : undefined
          }
        }).filter((g) => g.place)
      : []
    return { guesses, summary: parsed.summary ? String(parsed.summary) : undefined }
  })

  // ===== Mail (mail.tm disposable mailboxes) =====
  ipcMain.handle('mail:create', (_e, localPart?: string) => createMailbox(localPart))
  ipcMain.handle('mail:messages', (_e, token: string, base?: string) => listMessages(token, base))
  ipcMain.handle('mail:message', (_e, token: string, id: string, base?: string) => getMessage(token, id, base))

  // ===== Settings =====
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, s: Partial<AppSettings>) => {
    for (const [key, value] of Object.entries(s)) putSetting(key, value)
    return getSettings()
  })
  ipcMain.handle('settings:pickVault', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Select your Obsidian vault folder',
      properties: ['openDirectory', 'createDirectory']
    })
    if (res.canceled || !res.filePaths[0]) return null
    putSetting('vaultPath', res.filePaths[0])
    return res.filePaths[0]
  })
}
