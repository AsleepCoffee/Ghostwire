// Shared types used by both the Electron main process and the React renderer.

export type PersonaStatus = 'draft' | 'active' | 'burned'

export type ProjectType = 'person' | 'company' | 'other'
export type ProjectStatus = 'active' | 'paused' | 'closed'

/** A structured known fact about the investigation's subject. `type` matches
 *  EntityType so it maps straight onto the link chart. */
export interface DataPoint {
  id: string
  type: EntityType
  value: string
  note?: string
}

export interface Project {
  id: string
  name: string
  type: ProjectType
  /** The target of the investigation (a person's name, a company, a domain…). */
  subject: string
  status: ProjectStatus
  /** Structured known data points (emails, usernames, domains, …). */
  dataPoints: DataPoint[]
  /** What we already know (freeform). */
  known: string
  /** What we're trying to find out. */
  objectives: string
  createdAt: number
  updatedAt: number
}

export interface ProjectCounts {
  personas: number
  notes: number
  boards: number
}

export interface PersonaAccount {
  platform: string
  url?: string
  username?: string
  password?: string
  notes?: string
  /** Whether the account has actually been registered yet. */
  status?: 'planned' | 'created'
}

/** A mailbox provisioned for a persona — disposable (mail.tm) or a catch-all on your own domain. */
export interface PersonaMailbox {
  provider: 'mailtm' | 'catchall'
  address: string
  password: string
  /** mail.tm auth token (disposable provider only). */
  token?: string
  createdAt: number
}

export interface MailMessage {
  id: string
  from: string
  subject: string
  intro: string
  seen: boolean
  date: string
}

export interface MailMessageFull extends MailMessage {
  text: string
  html: string[]
}

export interface Persona {
  id: string
  name: string
  handle: string
  status: PersonaStatus
  projectId?: string | null
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
  /** A disposable mailbox provisioned for this persona, if any. */
  mailbox?: PersonaMailbox | null
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
  projectId?: string | null
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
  projectId?: string | null
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

export type ToolHealth = 'ok' | 'blocked' | 'login' | 'error'

export interface ToolLink {
  id: string
  name: string
  url: string
  category: string
  description?: string
  builtin: boolean
  sortOrder: number
  /** 'embed' opens in the in-app browser; 'external' opens the system browser. */
  openMode: 'embed' | 'external'
  health?: ToolHealth | null
  checkedAt?: number | null
}

export interface ToolTestResult {
  id: string
  name: string
  health: ToolHealth
  finalUrl?: string
}

export interface AppSettings {
  vaultPath?: string
  /** Theme preset id (see THEMES in the renderer). */
  theme?: string
  /** Show the Training & Course Notes section. */
  showTraining?: boolean
  /** API keys keyed by service id. */
  apiKeys?: Record<string, string>
  /** Your catch-all email domain (e.g. example.com) for persona mailboxes. */
  catchAllDomain?: string
  /** The investigation new evidence/captures are filed under. */
  activeProjectId?: string | null
}

export interface Activity {
  id: string
  projectId: string
  type: string
  message: string
  at: number
}

export interface ExifResult {
  gps?: { lat: number; lng: number }
  make?: string
  model?: string
  dateTime?: string
  software?: string
}

export interface Evidence {
  id: string
  projectId: string | null
  kind: 'screenshot' | 'image' | 'file'
  /** gwmedia:// url to the stored artifact. */
  path: string
  sourceUrl?: string
  title?: string
  sha256: string
  capturedAt: number
  note?: string
}

export interface UpdateStatus {
  state: 'checking' | 'available' | 'none' | 'downloading' | 'ready' | 'error' | 'dev'
  version?: string
  percent?: number
  message?: string
}

/** The API surface exposed on `window.api` via the preload bridge. */
export interface OsintApi {
  projects: {
    list(): Promise<Project[]>
    get(id: string): Promise<Project | null>
    save(p: Partial<Project>): Promise<Project>
    remove(id: string): Promise<void>
    counts(): Promise<Record<string, ProjectCounts>>
    contents(id: string): Promise<{ personas: Persona[]; notes: Note[]; boards: Board[] }>
    exportReport(id: string): Promise<string | null>
  }
  evidence: {
    capture(payload: {
      dataUrl: string
      sourceUrl?: string
      title?: string
      projectId?: string | null
      kind?: Evidence['kind']
    }): Promise<Evidence>
    list(projectId: string | null): Promise<Evidence[]>
    remove(id: string): Promise<void>
  }
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
    testAll(): Promise<ToolTestResult[]>
    onTestProgress(cb: (r: ToolTestResult & { done: number; total: number }) => void): () => void
  }
  files: {
    /** Open a file picker, copy the chosen image into app media, return a gwmedia:// url. */
    pickImage(kind: string): Promise<string | null>
    /** Persist a data URL (e.g. a pasted image) into app media, return a gwmedia:// url. */
    saveDataUrl(dataUrl: string, kind: string): Promise<string>
    /** Download an image from a URL into app media, return a gwmedia:// url (or null). */
    fetchImage(url: string, kind: string): Promise<string | null>
    /** Parse EXIF (GPS + camera) from a stored gwmedia:// image. */
    exif(mediaUrl: string): Promise<ExifResult>
    /** Save a data URL (e.g. an exported graph PNG) to a user-chosen file. Returns the path. */
    exportImage(dataUrl: string, defaultName: string): Promise<string | null>
  }
  activity: {
    log(projectId: string, type: string, message: string): Promise<void>
    list(projectId: string): Promise<Activity[]>
  }
  shell: {
    openExternal(url: string): Promise<void>
  }
  net: {
    fetchJson(url: string, headers?: Record<string, string>): Promise<unknown>
    /** Final HTTP status for a URL (HEAD, falling back to GET). 0 on network error. */
    httpStatus(url: string): Promise<number>
  }
  mail: {
    create(localPart?: string): Promise<PersonaMailbox>
    messages(token: string): Promise<MailMessage[]>
    message(token: string, id: string): Promise<MailMessageFull>
  }
  apiKeys: {
    test(
      id: string,
      key: string
    ): Promise<{ ok: boolean; status: 'valid' | 'invalid' | 'error' | 'untestable'; message: string }>
  }
  app: {
    version(): Promise<string>
    /** Whether the local database is encrypted at rest by the OS keystore. */
    encryptionStatus(): Promise<boolean>
  }
  win: {
    minimize(): void
    toggleMaximize(): void
    close(): void
    isMaximized(): Promise<boolean>
    onMaximizeChange(cb: (maximized: boolean) => void): () => void
  }
  updates: {
    check(): Promise<void>
    download(): Promise<void>
    install(): Promise<void>
    onStatus(cb: (s: UpdateStatus) => void): () => void
  }
  settings: {
    get(): Promise<AppSettings>
    set(s: Partial<AppSettings>): Promise<AppSettings>
    pickVault(): Promise<string | null>
  }
}
