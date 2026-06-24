// Shared types used by both the Electron main process and the React renderer.

export type PersonaStatus = 'draft' | 'active' | 'burned'

export interface PersonaAccount {
  platform: string
  url?: string
  username?: string
  password?: string
  notes?: string
}

export interface Persona {
  id: string
  name: string
  handle: string
  status: PersonaStatus
  avatarPath?: string | null
  bio?: string
  gender?: string
  birthdate?: string
  location?: string
  nationality?: string
  email?: string
  phone?: string
  occupation?: string
  backstory?: string
  accounts: PersonaAccount[]
  tags: string[]
  /** Unique Electron session partition so each persona has isolated cookies/storage. */
  partition: string
  createdAt: number
  updatedAt: number
}

export interface Note {
  id: string
  title: string
  body: string
  folder: string
  tags: string[]
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export type EntityType =
  | 'person'
  | 'username'
  | 'email'
  | 'phone'
  | 'domain'
  | 'ip'
  | 'organization'
  | 'location'
  | 'social'
  | 'image'
  | 'document'
  | 'wallet'
  | 'custom'

export interface Board {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
}

export interface EntityNode {
  id: string
  boardId: string
  type: EntityType
  label: string
  props: Record<string, string>
  notes?: string
  x: number
  y: number
  createdAt: number
}

export interface EntityEdge {
  id: string
  boardId: string
  source: string
  target: string
  label?: string
  createdAt: number
}

export interface ToolLink {
  id: string
  name: string
  url: string
  category: string
  description?: string
  builtin: boolean
  sortOrder: number
}

export interface AppSettings {
  vaultPath?: string
}

/** The API surface exposed on `window.api` via the preload bridge. */
export interface OsintApi {
  personas: {
    list(): Promise<Persona[]>
    get(id: string): Promise<Persona | null>
    save(p: Partial<Persona>): Promise<Persona>
    remove(id: string): Promise<void>
  }
  notes: {
    list(): Promise<Note[]>
    get(id: string): Promise<Note | null>
    save(n: Partial<Note>): Promise<Note>
    remove(id: string): Promise<void>
    exportAll(): Promise<{ exported: number; dir: string } | null>
    exportOne(id: string): Promise<string | null>
  }
  boards: {
    list(): Promise<Board[]>
    save(b: Partial<Board>): Promise<Board>
    remove(id: string): Promise<void>
    graph(boardId: string): Promise<{ nodes: EntityNode[]; edges: EntityEdge[] }>
    saveNode(n: Partial<EntityNode>): Promise<EntityNode>
    removeNode(id: string): Promise<void>
    saveEdge(e: Partial<EntityEdge>): Promise<EntityEdge>
    removeEdge(id: string): Promise<void>
  }
  tools: {
    list(): Promise<ToolLink[]>
    save(t: Partial<ToolLink>): Promise<ToolLink>
    remove(id: string): Promise<void>
  }
  settings: {
    get(): Promise<AppSettings>
    set(s: Partial<AppSettings>): Promise<AppSettings>
    pickVault(): Promise<string | null>
  }
}
