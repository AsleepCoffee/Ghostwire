import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { all, get, run } from './db'
import { exportAllNotes, writeNote } from './export'
import { pickImage, saveDataUrl } from './media'
import { testAllTools } from './toolcheck'
import { testApiKey } from './apitest'
import type {
  AppSettings,
  Board,
  EntityEdge,
  EntityNode,
  Note,
  Persona,
  Project,
  ToolLink
} from '../shared/types'

const now = (): number => Date.now()
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
    partition: String(r.partition),
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
    known: String(r.known ?? ''),
    objectives: String(r.objectives ?? ''),
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

// ---------- settings ----------
function parseSetting(v: string): unknown {
  try {
    return JSON.parse(v)
  } catch {
    return v // legacy plain-string values (e.g. an older vaultPath)
  }
}

function getSettings(): AppSettings {
  const rows = all<{ key: string; value: string }>('SELECT key, value FROM settings')
  const out: Record<string, unknown> = {}
  for (const row of rows) out[row.key] = parseSetting(row.value)
  // Defaults
  if (out.showTraining === undefined) out.showTraining = true
  if (!out.theme || out.theme === 'cyan') out.theme = 'midnight'
  if (!out.apiKeys || typeof out.apiKeys !== 'object') out.apiKeys = {}
  return out as AppSettings
}

function putSetting(key: string, value: unknown): void {
  run('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [
    key,
    JSON.stringify(value)
  ])
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
      `INSERT INTO projects (id,name,type,subject,status,known,objectives,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, type=excluded.type, subject=excluded.subject, status=excluded.status,
         known=excluded.known, objectives=excluded.objectives, updatedAt=excluded.updatedAt`,
      [
        id,
        p.name ?? 'Untitled investigation',
        p.type ?? 'person',
        p.subject ?? '',
        p.status ?? 'active',
        p.known ?? '',
        p.objectives ?? '',
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
      `INSERT INTO personas (id,name,handle,status,projectId,avatarPath,bio,gender,birthdate,location,nationality,email,phone,occupation,backstory,accounts,tags,partition,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, handle=excluded.handle, status=excluded.status, projectId=excluded.projectId, avatarPath=excluded.avatarPath,
         bio=excluded.bio, gender=excluded.gender, birthdate=excluded.birthdate, location=excluded.location,
         nationality=excluded.nationality, email=excluded.email, phone=excluded.phone, occupation=excluded.occupation,
         backstory=excluded.backstory, accounts=excluded.accounts, tags=excluded.tags, updatedAt=excluded.updatedAt`,
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
        partition,
        existing ? Number((existing as Record<string, unknown>).createdAt) : t,
        t
      ]
    )
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

  // ===== API key testing =====
  ipcMain.handle('apikeys:test', (_e, id: string, key: string) => testApiKey(id, key))

  // ===== Shell =====
  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    if (/^https?:\/\//i.test(url)) await shell.openExternal(url)
  })

  // ===== Network (for graph transforms / free APIs; bypasses renderer CORS) =====
  ipcMain.handle('net:fetchJson', async (_e, url: string, headers?: Record<string, string>) => {
    if (!/^https:\/\//i.test(url)) throw new Error('Only https URLs are allowed')
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GhostWire-OSINT', Accept: 'application/json', ...(headers ?? {}) }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  })

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
