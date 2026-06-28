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
  /** IANA time zone for the subject (e.g. "America/New_York") — shown as a clock. */
  timezone?: string
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
  /** auth token (disposable provider only). */
  token?: string
  /** API base the disposable mailbox lives on (mail.tm or mail.gw). */
  base?: string
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
  /** Id of the VPN config (exit country) this persona browses through, if any. */
  vpnConfigId?: string | null
  createdAt: number
  updatedAt: number
}

/** A Proton WireGuard config imported by the user; one exit location.
 *  We run a userspace `wireproxy` tunnel per config that exposes a local SOCKS5
 *  port, and pin each persona's browser session to its assigned port. */
export interface VpnConfig {
  id: string
  /** User-facing label, e.g. "Germany" — defaults to the imported filename. */
  name: string
  /** Endpoint host:port parsed from the WireGuard config (display only). */
  endpoint?: string
  /** Local SOCKS5 port this tunnel binds to (stable once assigned). */
  socksPort: number
  createdAt: number
}

export interface VpnConfigStatus extends VpnConfig {
  running: boolean
  /** Last spawn/runtime error, if the tunnel failed. */
  error?: string
}

export interface VpnState {
  /** Whether the `wireproxy` binary was located. The whole feature is inert without it. */
  binaryPresent: boolean
  binaryPath?: string
  configs: VpnConfigStatus[]
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
  /** Your real inbox that the catch-all forwards to (used to open its webmail). */
  personalEmail?: string
  /** Password for the receiving account, used to auto-fill its webmail login if you get signed out. Stored locally in plaintext. */
  personalEmailPassword?: string
  /** The investigation new evidence/captures are filed under. */
  activeProjectId?: string | null
  /** Folder where data backups (DB + media) are written. */
  backupDir?: string
  /** Auto-create a backup on launch (at most once per ~day). */
  autoBackup?: boolean
  /** Timestamp of the last successful backup. */
  lastBackupAt?: number
  /** Extra world clocks pinned to the dashboard. */
  worldClocks?: { label: string; tz: string }[]
  /** Harden each persona's browser fingerprint (UA + canvas/WebGL/navigator). Default on. */
  hardenFingerprint?: boolean
  /** App-wide VPN exit: route the whole app (and personas without their own exit) through this config. */
  globalVpnConfigId?: string | null
  /** Hunchly-style selectors per investigation (keyed by project id; "_global" when none). */
  selectorsByProject?: Record<string, string[]>
  /** Highlight selectors on pages (default on when selectors exist). */
  highlightSelectors?: boolean
  /** Remembered report-export choices (branding, prepared-by, classification). */
  reportOptions?: ReportOptions
  /** Show the curated OSINT bookmarks panel in the in-app browser. */
  showBookmarks?: boolean
  /** Open in-app browser tabs, restored on next launch so the session persists. */
  browserTabs?: { url: string; personaId?: string }[]
  /** Index of the active tab among browserTabs, restored on next launch. */
  browserActiveIndex?: number
}

export interface BackupInfo {
  name: string
  path: string
  at: number
  sizeMB: number
}

export interface Activity {
  id: string
  projectId: string
  type: string
  message: string
  at: number
}

export interface GravatarResult {
  found: boolean
  hash: string
  displayName?: string
  profileUrl?: string
  location?: string
  about?: string
  accounts?: { label: string; url: string }[]
  photos?: string[]
}

export interface HibpBreach {
  name: string
  date: string
  count: number
  classes: string
}

export interface EmailVerify {
  ok: boolean
  error?: string
  status?: 'deliverable' | 'undeliverable' | 'risky' | 'unknown'
  reason?: string
  /** 0–100 trust score. */
  score?: number
  level?: string
  disposable?: boolean
  role?: boolean
  free?: boolean
  catchAll?: boolean
}

export interface WigleNetwork {
  ssid: string
  bssid: string
  lat: number
  lng: number
  encryption: string
  channel?: number
  lastSeen: string
  place: string
}

export interface WigleResult {
  ok: boolean
  error?: string
  total?: number
  results?: WigleNetwork[]
}

/** A post or comment recovered from a Reddit archive (PullPush / Arctic Shift).
 *  The archived `author` survives even after the account/content is deleted. */
export interface RedditItem {
  kind: 'submission' | 'comment'
  id: string
  author: string
  /** Reddit's internal account id (t2_xxxxx) — stable even if the name changes. */
  authorFullname?: string
  subreddit: string
  title?: string
  body: string
  /** Unix seconds. */
  created: number
  score?: number
  permalink: string
}

/** One host discovered/probed during automated domain recon. */
export interface ReconHost {
  host: string
  ip?: string
  /** Responded to an HTTP(S) request (httprobe-style liveness). */
  alive: boolean
  status: number
  title?: string
  scheme?: 'https' | 'http'
}

/** Aggregated passive recon over a domain (multi-source subdomain enumeration +
 *  DNS + WHOIS + liveness), the equivalent of running subfinder/assetfinder/amass
 *  + httprobe together. */
export interface ReconResult {
  ok: boolean
  error?: string
  domain: string
  whois: { registrar: string; created: string; expires: string; org: string; nameservers: string[] }
  dns: { a: string[]; mx: string[]; ns: string[]; txt: string[] }
  ips: string[]
  hosts: ReconHost[]
  emails: string[]
  /** How many hostnames each source contributed (for transparency). */
  sources: Record<string, number>
}

export interface RedditResult {
  ok: boolean
  error?: string
  mode?: 'thread' | 'user'
  /** thread mode — the original post (with its real author, even if deleted). */
  submission?: RedditItem
  /** user mode — the resolved username. */
  username?: string
  authorFullname?: string
  /** Recovered items: comments for a thread, or recent activity for a user. */
  items?: RedditItem[]
  /** How many of each archive source returned data, for transparency. */
  source?: string
}

export interface ShodanService {
  port: number
  transport: string
  product: string
  version: string
  module: string
  banner: string
}

export interface ShodanResult {
  ok: boolean
  error?: string
  note?: string
  ip?: string
  org?: string
  isp?: string
  asn?: string
  os?: string
  country?: string
  city?: string
  lastUpdate?: string
  hostnames?: string[]
  ports?: number[]
  services?: ShodanService[]
  vulns?: string[]
  tags?: string[]
  subdomains?: string[]
}

export interface FacebookId {
  ok: boolean
  error?: string
  id?: string
  vanity?: string
}

export interface LeakCheckResult {
  ok: boolean
  error?: string
  found?: number
  /** Field types exposed across the breaches (e.g. password, email, ip). */
  fields?: string[]
  sources?: { name: string; date: string }[]
}

export interface HudsonStealer {
  date: string
  os: string
  computer: string
  userServices: number
  corpServices: number
}

export interface HudsonResult {
  ok: boolean
  error?: string
  infected?: boolean
  message?: string
  stealers?: HudsonStealer[]
}

export interface HunterEmail {
  email: string
  firstName?: string
  lastName?: string
  position?: string
  department?: string
  seniority?: string
  /** 'personal' | 'generic'. */
  type?: string
  /** 0–100 deliverability confidence. */
  confidence?: number
  linkedin?: string
}

export interface HunterResult {
  ok: boolean
  error?: string
  domain?: string
  organization?: string
  /** The email-address pattern, e.g. "{first}.{last}". */
  pattern?: string
  total?: number
  emails?: HunterEmail[]
}

export interface ExifResult {
  gps?: { lat: number; lng: number }
  make?: string
  model?: string
  dateTime?: string
  software?: string
  /** Size of the stored file in bytes. */
  fileSize?: number
  /** Every parsed metadata tag (EXIF/GPS/IPTC/XMP), stringified. */
  all?: Record<string, string>
}

/** A sidecar file captured alongside an exhibit (forensic web capture):
 *  the page archive (MHTML), the raw HTML, or the capture manifest. */
export interface EvidenceArtifact {
  /** Human label, e.g. "Page archive (MHTML)". */
  name: string
  /** gwmedia:// url to the stored file. */
  path: string
  /** MIME-ish kind, e.g. "multipart/related", "text/html", "application/json". */
  kind: string
  sha256: string
  bytes: number
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
  /** Text extracted from the image via OCR. */
  ocr?: string
  /** A location assigned to this exhibit (from EXIF, an AI guess, or set by hand). */
  geoLat?: number | null
  geoLng?: number | null
  geoLabel?: string
  /** Forensic sidecar files (page archive, manifest) captured with this exhibit. */
  artifacts?: EvidenceArtifact[]
}

/** One candidate location for an image, from the AI geolocation model. */
export interface GeoGuess {
  place: string
  country?: string
  lat?: number | null
  lng?: number | null
  /** 0–100. */
  confidence?: number
  reasoning?: string
}

export interface GeoResult {
  guesses: GeoGuess[]
  summary?: string
}

/** Per-export choices for case reports (branding + client deliverable header). */
export interface ReportOptions {
  /** Include GhostWire logo/name/footer. Default true. */
  branded: boolean
  /** "Prepared by" — analyst/investigator name on the cover. */
  analyst?: string
  /** Organisation / agency name on the cover. */
  org?: string
  /** Confidentiality marking, e.g. CONFIDENTIAL. */
  classification?: string
}

/** Result of re-hashing a stored exhibit to confirm it is unaltered. */
export interface EvidenceVerify {
  /** verified = matches capture hash · altered = mismatch · recorded = legacy item just hashed · missing = file gone. */
  status: 'verified' | 'altered' | 'recorded' | 'missing'
  sizeBytes: number
  storedHash: string
  currentHash: string
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
    /** Export a Markdown report (to the vault if set, else a chosen file). */
    exportReport(id: string, opts?: ReportOptions): Promise<string | null>
    /** Export a self-contained HTML report (graph + evidence + notes + timeline). */
    exportReportHtml(id: string, opts?: ReportOptions): Promise<string | null>
    /** Export the report rendered to PDF. */
    exportReportPdf(id: string, opts?: ReportOptions): Promise<string | null>
    /** Export the report as an editable Word (.docx) document. */
    exportReportDocx(id: string, opts?: ReportOptions): Promise<string | null>
  }
  evidence: {
    capture(payload: {
      dataUrl: string
      sourceUrl?: string
      title?: string
      projectId?: string | null
      kind?: Evidence['kind']
    }): Promise<Evidence>
    /** Forensic web capture: full-page screenshot + MHTML page archive + a hashed
     *  manifest, all filed as one exhibit with sidecar artifacts. */
    forensicCapture(payload: {
      webContentsId: number
      sourceUrl?: string
      title?: string
      projectId?: string | null
    }): Promise<{ ok: boolean; error?: string; evidence?: Evidence; thumb?: string }>
    /** Save a stored artifact (e.g. the MHTML archive) out to a file on disk. */
    exportArtifact(path: string, defaultName: string): Promise<string | null>
    list(projectId: string | null): Promise<Evidence[]>
    remove(id: string): Promise<void>
    setNote(id: string, note: string): Promise<void>
    /** Set the caption/title of an evidence item. */
    setTitle(id: string, title: string): Promise<void>
    setOcr(id: string, ocr: string): Promise<void>
    /** Run offline OCR on a stored image; returns the extracted text. */
    ocr(id: string): Promise<string>
    /** Re-hash the stored file and compare to the capture-time hash (chain of custody). */
    verify(id: string): Promise<EvidenceVerify>
    fromUrl(url: string, projectId: string | null): Promise<Evidence>
    /** Assign (or clear, with null lat/lng) a map location for this exhibit. */
    setGeo(id: string, lat: number | null, lng: number | null, label?: string): Promise<void>
    /** Copy the stored image to the OS clipboard (so it can be pasted into a reverse-image engine). */
    copyImage(id: string): Promise<boolean>
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
    /** Fetch a random AI-generated face for a persona avatar (gwmedia:// url or null). */
    randomAvatar(): Promise<string | null>
    /** Save a stored gwmedia image to a user-chosen file (e.g. to upload to a profile). */
    saveCopy(mediaUrl: string, defaultName: string): Promise<string | null>
    /** Parse EXIF (GPS + camera) from a stored gwmedia:// image. */
    exif(mediaUrl: string): Promise<ExifResult>
    /** A stored gwmedia:// image as a data URL (for OCR / processing). */
    dataUrl(mediaUrl: string): Promise<string | null>
    /** Save a data URL (e.g. an exported graph PNG) to a user-chosen file. Returns the path. */
    exportImage(dataUrl: string, defaultName: string): Promise<string | null>
  }
  activity: {
    log(projectId: string, type: string, message: string): Promise<void>
    list(projectId: string): Promise<Activity[]>
  }
  shell: {
    /** Opens the URL as a tab in the in-app browser (never the system browser). */
    openExternal(url: string): Promise<void>
  }
  browser: {
    /** Subscribe to main-process requests to open URLs as in-app browser tabs. */
    onOpen(cb: (urls: string[]) => void): () => void
    /** Forensic full-page screenshot of a webview's whole scrollable page (CDP). */
    captureFullPage(
      webContentsId: number
    ): Promise<{ ok: boolean; error?: string; dataUrl?: string; width?: number; height?: number }>
  }
  clipboard: {
    writeText(text: string): Promise<void>
    /** Copy an image (data: URL) to the OS clipboard. Returns false if it couldn't decode. */
    writeImage(dataUrl: string): Promise<boolean>
  }
  net: {
    fetchJson(url: string, headers?: Record<string, string>): Promise<unknown>
    /** Final HTTP status for a URL (HEAD, falling back to GET). 0 on network error. */
    httpStatus(url: string): Promise<number>
  }
  mail: {
    create(localPart?: string): Promise<PersonaMailbox>
    messages(token: string, base?: string): Promise<MailMessage[]>
    message(token: string, id: string, base?: string): Promise<MailMessageFull>
  }
  apiKeys: {
    test(
      id: string,
      key: string
    ): Promise<{ ok: boolean; status: 'valid' | 'invalid' | 'error' | 'untestable'; message: string }>
  }
  intel: {
    gravatar(email: string): Promise<GravatarResult>
    hibp(email: string, key: string): Promise<{ ok: boolean; error?: string; breaches?: HibpBreach[] }>
    /** AI geolocation: ask a vision model where an evidence image was taken. */
    geolocate(evidenceId: string): Promise<GeoResult>
    /** Hunter.io domain search — people/emails for a company name or domain. */
    hunterDomain(query: string, key: string): Promise<HunterResult>
    /** Email Hippo mailbox verification — does this address actually exist? */
    verifyEmail(email: string, key: string): Promise<EmailVerify>
    /** LeakCheck public — which breaches an email/username appears in (no key). */
    leakcheck(query: string): Promise<LeakCheckResult>
    /** Hudson Rock — info-stealer infection exposure for an email (no key). */
    hudsonrock(email: string): Promise<HudsonResult>
    /** Resolve a Facebook numeric ID <-> vanity from a profile URL/username. */
    facebookId(input: string): Promise<FacebookId>
    /** Resolve an Instagram numeric ID <-> username from a profile URL/username. */
    instagramId(input: string): Promise<FacebookId>
    /** Verbose Shodan host/domain intelligence (needs a Shodan key). */
    shodan(target: string, key: string): Promise<ShodanResult>
    /** WiGLE wireless-network search by SSID or BSSID (needs a WiGLE token). */
    wigle(query: string, kind: 'ssid' | 'bssid', key: string): Promise<WigleResult>
    /** Reddit archive lookup — recover a deleted post/comment author or a user's
     *  activity from PullPush / Arctic Shift (no key). Input is a URL, post id,
     *  or username; mode hints how to treat a bare token. */
    reddit(input: string, mode: 'thread' | 'user'): Promise<RedditResult>
    /** Automated passive domain recon — multi-source subdomain enumeration + DNS
     *  + WHOIS + HTTP liveness, all at once. No key needed. */
    reconDomain(domain: string): Promise<ReconResult>
    /** The bundled Sherlock site list (name + url template with {}). */
    sherlockSites(): Promise<{ name: string; url: string }[]>
    /** Check one Sherlock site for a username. */
    sherlockCheck(name: string, username: string): Promise<{ found: boolean; url: string; status: number; invalid?: boolean }>
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
  vpn: {
    /** Current binary presence + every config with its live running state. */
    state(): Promise<VpnState>
    /** Open a file picker to import one or more Proton .conf files. Returns count imported. */
    import(): Promise<number>
    rename(id: string, name: string): Promise<void>
    remove(id: string): Promise<void>
    start(id: string): Promise<VpnConfigStatus>
    stop(id: string): Promise<VpnConfigStatus>
    /** Start every imported tunnel (no-op if the binary is missing). */
    startAll(): Promise<void>
    /** Re-pin every persona's browser session to its assigned exit (or direct). */
    apply(): Promise<void>
    /** One-click: download the latest wireproxy build for this OS into the app's bin folder. */
    installEngine(): Promise<{ ok: boolean; path?: string; error?: string }>
    onStatus(cb: (s: VpnState) => void): () => void
  }
  backup: {
    /** Create a timestamped backup (DB + media) in the configured folder. */
    run(): Promise<{ ok: boolean; path?: string; error?: string }>
    /** Existing backups in the configured folder, newest first. */
    list(): Promise<BackupInfo[]>
    /** Pick the backup folder (persists to settings). Returns the chosen path. */
    pickFolder(): Promise<string | null>
    /** Open a backup folder (or the configured one) in the OS file manager. */
    reveal(path?: string): Promise<void>
    /** Restore DB + media from a backup folder, then relaunch. */
    restore(path?: string): Promise<{ ok: boolean; error?: string }>
    /** Export the whole workspace to one portable .gwpack file. Returns the path. */
    exportPack(): Promise<string | { error: string } | null>
    /** Import a .gwpack (replaces all data), then relaunch. */
    importPack(path?: string): Promise<{ ok: boolean; error?: string }>
  }
}
