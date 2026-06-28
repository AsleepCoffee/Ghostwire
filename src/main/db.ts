import { app } from 'electron'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import initSqlJs, { Database, SqlJsStatic } from 'sql.js'

const require = createRequire(import.meta.url)

let SQL: SqlJsStatic
let db: Database
let dbPath: string
let saveTimer: NodeJS.Timeout | null = null

/** Locate the sql-wasm.wasm shipped inside the sql.js package. */
function wasmPath(): string {
  try {
    // sql.js exposes ./dist/* in its package "exports" map.
    return require.resolve('sql.js/dist/sql-wasm.wasm')
  } catch {
    // Fallback: derive from the resolved package main (dist/sql-wasm.js).
    return join(dirname(require.resolve('sql.js')), 'sql-wasm.wasm')
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'person',
  subject TEXT,
  status TEXT DEFAULT 'active',
  dataPoints TEXT DEFAULT '[]',
  known TEXT DEFAULT '',
  objectives TEXT DEFAULT '',
  timezone TEXT DEFAULT '',
  createdAt INTEGER,
  updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT,
  status TEXT DEFAULT 'draft',
  projectId TEXT,
  avatarPath TEXT,
  bio TEXT,
  gender TEXT,
  birthdate TEXT,
  location TEXT,
  nationality TEXT,
  email TEXT,
  phone TEXT,
  occupation TEXT,
  backstory TEXT,
  accounts TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  mailbox TEXT,
  partition TEXT NOT NULL,
  createdAt INTEGER,
  updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  folder TEXT DEFAULT 'Inbox',
  projectId TEXT,
  tags TEXT DEFAULT '[]',
  pinned INTEGER DEFAULT 0,
  createdAt INTEGER,
  updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  projectId TEXT,
  createdAt INTEGER,
  updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  boardId TEXT NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  props TEXT DEFAULT '{}',
  notes TEXT,
  x REAL DEFAULT 0,
  y REAL DEFAULT 0,
  createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  boardId TEXT NOT NULL,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  label TEXT,
  createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  description TEXT,
  builtin INTEGER DEFAULT 0,
  sortOrder INTEGER DEFAULT 0,
  openMode TEXT DEFAULT 'embed',
  health TEXT,
  checkedAt INTEGER
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  projectId TEXT,
  kind TEXT DEFAULT 'screenshot',
  path TEXT NOT NULL,
  sourceUrl TEXT,
  title TEXT,
  sha256 TEXT,
  capturedAt INTEGER,
  note TEXT,
  ocr TEXT,
  geoLat REAL,
  geoLng REAL,
  geoLabel TEXT
);

CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  type TEXT,
  message TEXT,
  at INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS vpn_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  endpoint TEXT,
  socksPort INTEGER NOT NULL,
  config TEXT NOT NULL,
  createdAt INTEGER
);
`

export async function initDb(): Promise<void> {
  SQL = await initSqlJs({ locateFile: () => wasmPath() })

  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  dbPath = join(dir, 'ghostwire.db')

  if (existsSync(dbPath)) {
    db = new SQL.Database(readFileSync(dbPath))
  } else {
    db = new SQL.Database()
  }
  db.run(SCHEMA)
  migrate()
  seedTools()
  persist(true)
}

/** Whether the local DB is encrypted at rest by the app. Currently false —
 *  whole-DB OS encryption was unreliable to decrypt across runs (data-loss risk),
 *  so we rely on OS full-disk encryption instead. */
export function encryptionAvailable(): boolean {
  return false
}

/** Idempotent column additions for DBs created before a column existed. */
function migrate(): void {
  const adds = [
    "ALTER TABLE tools ADD COLUMN openMode TEXT DEFAULT 'embed'",
    'ALTER TABLE tools ADD COLUMN health TEXT',
    'ALTER TABLE tools ADD COLUMN checkedAt INTEGER',
    'ALTER TABLE personas ADD COLUMN projectId TEXT',
    'ALTER TABLE notes ADD COLUMN projectId TEXT',
    'ALTER TABLE boards ADD COLUMN projectId TEXT',
    "ALTER TABLE projects ADD COLUMN dataPoints TEXT DEFAULT '[]'",
    'ALTER TABLE personas ADD COLUMN mailbox TEXT',
    'ALTER TABLE personas ADD COLUMN vpnConfigId TEXT',
    'ALTER TABLE personas ADD COLUMN nationality TEXT',
    'ALTER TABLE personas ADD COLUMN phone TEXT',
    "ALTER TABLE projects ADD COLUMN timezone TEXT DEFAULT ''",
    'ALTER TABLE evidence ADD COLUMN ocr TEXT',
    'ALTER TABLE evidence ADD COLUMN geoLat REAL',
    'ALTER TABLE evidence ADD COLUMN geoLng REAL',
    'ALTER TABLE evidence ADD COLUMN geoLabel TEXT',
    'ALTER TABLE evidence ADD COLUMN artifacts TEXT'
  ]
  for (const sql of adds) {
    try {
      db.run(sql)
    } catch {
      // column already exists — ignore
    }
  }
}

/** Absolute path to the on-disk SQLite database file. */
export function databasePath(): string {
  return dbPath
}

/** Persist the in-memory DB to disk (debounced unless `immediate`). */
export function persist(immediate = false): void {
  const write = () => {
    writeFileSync(dbPath, Buffer.from(db.export()))
  }
  if (immediate) {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = null
    write()
    return
  }
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(write, 250)
}

export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql)
  stmt.bind(params as never)
  const rows: T[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as T)
  stmt.free()
  return rows
}

export function get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | null {
  const rows = all<T>(sql, params)
  return rows[0] ?? null
}

export function run(sql: string, params: unknown[] = []): void {
  const stmt = db.prepare(sql)
  stmt.bind(params as never)
  stmt.step()
  stmt.free()
  persist()
}

// Sites that are painful to use embedded (hard login walls / framebusting) → open externally.
const EXTERNAL_BY_DEFAULT = new Set([
  'LinkedIn',
  'Facebook',
  'Instagram',
  'PimEyes',
  'TikTok',
  'Dehashed'
])

function seedTools(): void {
  const count = get<{ c: number }>('SELECT COUNT(*) AS c FROM tools')?.c ?? 0
  if (count > 0) return
  let order = 0
  for (const t of DEFAULT_TOOLS) {
    run(
      'INSERT INTO tools (id, name, url, category, description, builtin, sortOrder, openMode) VALUES (?,?,?,?,?,1,?,?)',
      [
        cryptoId(),
        t.name,
        t.url,
        t.category,
        t.description ?? '',
        order++,
        EXTERNAL_BY_DEFAULT.has(t.name) ? 'external' : 'embed'
      ]
    )
  }
}

function cryptoId(): string {
  return globalThis.crypto.randomUUID()
}

/** Curated OSINT resources seeded on first launch. {QUERY} is replaced by the search term. */
const DEFAULT_TOOLS: { name: string; url: string; category: string; description?: string }[] = [
  { name: 'Google', url: 'https://www.google.com/search?q={QUERY}', category: 'Search', description: 'General web search. Use operators.' },
  { name: 'Google Dorks (Advanced)', url: 'https://www.google.com/search?q={QUERY}', category: 'Search', description: 'Use with site:, intitle:, filetype:, inurl:' },
  { name: 'Bing', url: 'https://www.bing.com/search?q={QUERY}', category: 'Search' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={QUERY}', category: 'Search' },
  { name: 'Yandex', url: 'https://yandex.com/search/?text={QUERY}', category: 'Search', description: 'Strong reverse-image & non-Western coverage.' },

  { name: 'WhatsMyName', url: 'https://whatsmyname.app/', category: 'Username', description: 'Username enumeration across hundreds of sites.' },
  { name: 'Sherlock (GitHub)', url: 'https://github.com/sherlock-project/sherlock', category: 'Username', description: 'CLI username hunter.' },
  { name: 'Namechk', url: 'https://namechk.com/', category: 'Username' },
  { name: 'Instant Username Search', url: 'https://instantusername.com/', category: 'Username' },

  { name: 'Have I Been Pwned', url: 'https://haveibeenpwned.com/', category: 'Email & Breach', description: 'Breach exposure lookup.' },
  { name: 'Hunter.io', url: 'https://hunter.io/', category: 'Email & Breach', description: 'Find/verify corporate emails.' },
  { name: 'EmailRep', url: 'https://emailrep.io/', category: 'Email & Breach', description: 'Email reputation & footprint.' },
  { name: 'Epieos', url: 'https://epieos.com/', category: 'Email & Breach', description: 'Email/phone to account lookup.' },
  { name: 'Dehashed', url: 'https://dehashed.com/', category: 'Email & Breach' },

  { name: 'Shodan', url: 'https://www.shodan.io/search?query={QUERY}', category: 'Infrastructure', description: 'Internet-connected device search.' },
  { name: 'Censys', url: 'https://search.censys.io/search?q={QUERY}', category: 'Infrastructure' },
  { name: 'crt.sh', url: 'https://crt.sh/?q={QUERY}', category: 'Infrastructure', description: 'Certificate transparency / subdomains.' },
  { name: 'ViewDNS', url: 'https://viewdns.info/', category: 'Infrastructure', description: 'DNS, reverse IP, whois history.' },
  { name: 'SecurityTrails', url: 'https://securitytrails.com/', category: 'Infrastructure' },
  { name: 'urlscan.io', url: 'https://urlscan.io/search/#{QUERY}', category: 'Infrastructure' },

  { name: 'Whois (ICANN)', url: 'https://lookup.icann.org/en/lookup', category: 'Domain' },
  { name: 'DNSdumpster', url: 'https://dnsdumpster.com/', category: 'Domain' },
  { name: 'Wayback Machine', url: 'https://web.archive.org/web/*/{QUERY}', category: 'Domain', description: 'Historical snapshots of a site.' },
  { name: 'BuiltWith', url: 'https://builtwith.com/{QUERY}', category: 'Domain', description: 'Tech stack profiler.' },

  { name: 'Google Images', url: 'https://www.google.com/search?tbm=isch&q={QUERY}', category: 'Image & Face' },
  { name: 'Yandex Images', url: 'https://yandex.com/images/search?rpt=imageview', category: 'Image & Face', description: 'Best reverse face search.' },
  { name: 'TinEye', url: 'https://tineye.com/', category: 'Image & Face' },
  { name: 'PimEyes', url: 'https://pimeyes.com/en', category: 'Image & Face', description: 'Facial recognition search.' },
  { name: 'EXIF Viewer (Jeffrey)', url: 'http://exif.regex.info/exif.cgi', category: 'Image & Face' },

  { name: 'Google Maps', url: 'https://www.google.com/maps/search/{QUERY}', category: 'Geo & Maps' },
  { name: 'Google Earth', url: 'https://earth.google.com/web/', category: 'Geo & Maps' },
  { name: 'Bing Maps', url: 'https://www.bing.com/maps?q={QUERY}', category: 'Geo & Maps' },
  { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/search?query={QUERY}', category: 'Geo & Maps' },
  { name: 'SunCalc', url: 'https://www.suncalc.org/', category: 'Geo & Maps', description: 'Shadow/time geolocation aid.' },

  { name: 'X / Twitter', url: 'https://twitter.com/search?q={QUERY}', category: 'Social' },
  { name: 'Facebook', url: 'https://www.facebook.com/search/top?q={QUERY}', category: 'Social' },
  { name: 'Instagram', url: 'https://www.instagram.com/{QUERY}/', category: 'Social' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/search/results/all/?keywords={QUERY}', category: 'Social' },
  { name: 'Reddit', url: 'https://www.reddit.com/search/?q={QUERY}', category: 'Social' },
  { name: 'TikTok', url: 'https://www.tiktok.com/search?q={QUERY}', category: 'Social' },
  { name: 'Telegram (search)', url: 'https://t.me/s/{QUERY}', category: 'Social' },

  { name: 'IntelTechniques Tools', url: 'https://inteltechniques.com/tools/', category: 'Toolkits', description: "Michael Bazzell's OSINT toolset." },
  { name: 'OSINT Framework', url: 'https://osintframework.com/', category: 'Toolkits', description: 'Categorized directory of OSINT resources.' },
  { name: 'Bellingcat Toolkit', url: 'https://bellingcat.gitbook.io/toolkit/', category: 'Toolkits' },
  { name: 'Start.me OSINT', url: 'https://start.me/p/DPYPMz/the-ultimate-osint-collection', category: 'Toolkits' }
]
