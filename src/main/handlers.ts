import { ipcMain, dialog, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { all, get, run } from './db'
import { exportAllNotes, writeNote } from './export'
import type {
  AppSettings,
  Board,
  EntityEdge,
  EntityNode,
  Note,
  Persona,
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
    sortOrder: Number(r.sortOrder ?? 0)
  }
}

// ---------- settings ----------
function getSettings(): AppSettings {
  const rows = all<{ key: string; value: string }>('SELECT key, value FROM settings')
  const out: AppSettings = {}
  for (const row of rows) {
    if (row.key === 'vaultPath') out.vaultPath = row.value
  }
  return out
}

export function registerHandlers(): void {
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
      `INSERT INTO personas (id,name,handle,status,avatarPath,bio,gender,birthdate,location,nationality,email,phone,occupation,backstory,accounts,tags,partition,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, handle=excluded.handle, status=excluded.status, avatarPath=excluded.avatarPath,
         bio=excluded.bio, gender=excluded.gender, birthdate=excluded.birthdate, location=excluded.location,
         nationality=excluded.nationality, email=excluded.email, phone=excluded.phone, occupation=excluded.occupation,
         backstory=excluded.backstory, accounts=excluded.accounts, tags=excluded.tags, updatedAt=excluded.updatedAt`,
      [
        id,
        p.name ?? 'Unnamed persona',
        p.handle ?? '',
        p.status ?? 'draft',
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
      `INSERT INTO notes (id,title,body,folder,tags,pinned,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title, body=excluded.body, folder=excluded.folder,
         tags=excluded.tags, pinned=excluded.pinned, updatedAt=excluded.updatedAt`,
      [
        id,
        n.title ?? 'Untitled',
        n.body ?? '',
        n.folder ?? 'Inbox',
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
      `INSERT INTO boards (id,name,description,createdAt,updatedAt)
       VALUES (?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, updatedAt=excluded.updatedAt`,
      [
        id,
        b.name ?? 'Untitled board',
        b.description ?? '',
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
      `INSERT INTO tools (id,name,url,category,description,builtin,sortOrder)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, url=excluded.url, category=excluded.category,
         description=excluded.description, sortOrder=excluded.sortOrder`,
      [
        id,
        tl.name ?? 'Tool',
        tl.url ?? '',
        tl.category ?? 'General',
        tl.description ?? '',
        tl.builtin ? 1 : 0,
        tl.sortOrder ?? 100
      ]
    )
    return mapTool(get('SELECT * FROM tools WHERE id = ?', [id])!)
  })
  ipcMain.handle('tools:remove', (_e, id: string) => {
    run('DELETE FROM tools WHERE id = ?', [id])
  })

  // ===== Settings =====
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, s: Partial<AppSettings>) => {
    for (const [key, value] of Object.entries(s)) {
      run('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [
        key,
        String(value)
      ])
    }
    return getSettings()
  })
  ipcMain.handle('settings:pickVault', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Select your Obsidian vault folder',
      properties: ['openDirectory', 'createDirectory']
    })
    if (res.canceled || !res.filePaths[0]) return null
    const dir = res.filePaths[0]
    run('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [
      'vaultPath',
      dir
    ])
    return dir
  })
}
