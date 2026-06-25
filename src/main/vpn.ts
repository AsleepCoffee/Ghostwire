import { app, dialog, ipcMain, session, webContents, BrowserWindow, type Session } from 'electron'
import { spawn, spawnSync, type ChildProcess } from 'child_process'
import { randomUUID } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { all, get, run } from './db'
import type { Persona, VpnConfig, VpnConfigStatus, VpnState } from '../shared/types'

/** Userspace WireGuard (wireproxy) supervisor.
 *
 *  Each imported Proton WireGuard config runs as its own `wireproxy` child that
 *  exposes a local SOCKS5 port. We pin each persona's Electron session partition
 *  to its assigned port, so personas browse out of different countries at once —
 *  with no admin rights and no change to system routing.
 *
 *  Opsec: a persona with an assigned exit is pinned to that SOCKS port even when
 *  the tunnel is down (fail-closed) — pages just fail to load rather than leaking
 *  the real IP. WebRTC is forced through the proxy for proxied sessions. */

const BASE_PORT = 25344
const exe = (n: string): string => (process.platform === 'win32' ? `${n}.exe` : n)

// ---------- binary discovery ----------
let cachedBinary: string | null = null // positive hit only — re-probe until found

/** Locate the wireproxy binary. Order: env override, app bin dir, bundled
 *  resources, then PATH. Returns null when it can't be found. Negative results
 *  aren't cached, so installing the binary at runtime is picked up live. */
function findBinary(): string | null {
  if (cachedBinary && existsSync(cachedBinary)) return cachedBinary
  const candidates = [
    process.env.GHOSTWIRE_WIREPROXY,
    join(app.getPath('userData'), 'bin', exe('wireproxy')),
    join(process.resourcesPath ?? '', 'bin', exe('wireproxy'))
  ].filter(Boolean) as string[]
  for (const c of candidates) {
    if (existsSync(c)) return (cachedBinary = c)
  }
  // PATH lookup — probe by running --version.
  try {
    const r = spawnSync(exe('wireproxy'), ['--version'], { timeout: 4000 })
    if (r.status === 0 || (r.stdout && r.stdout.length > 0)) return (cachedBinary = exe('wireproxy'))
  } catch {
    /* not on PATH */
  }
  return null
}

// ---------- config storage ----------
function mapConfig(r: Record<string, unknown>): VpnConfig {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    endpoint: (r.endpoint as string) ?? '',
    socksPort: Number(r.socksPort),
    createdAt: Number(r.createdAt)
  }
}

function listConfigs(): VpnConfig[] {
  return all('SELECT id,name,endpoint,socksPort,createdAt FROM vpn_configs ORDER BY createdAt').map(mapConfig)
}

function rawConfig(id: string): string | null {
  const r = get<{ config: string }>('SELECT config FROM vpn_configs WHERE id = ?', [id])
  return r ? String(r.config) : null
}

/** Lowest free SOCKS port at/above BASE_PORT not already taken by a config. */
function nextPort(): number {
  const taken = new Set(listConfigs().map((c) => c.socksPort))
  let p = BASE_PORT
  while (taken.has(p)) p++
  return p
}

/** Pull the [Peer] Endpoint out of a WireGuard config, for display. */
function parseEndpoint(text: string): string {
  const m = /^\s*Endpoint\s*=\s*(.+)\s*$/im.exec(text)
  return m ? m[1].trim() : ''
}

// ---------- process supervision ----------
interface Running {
  child: ChildProcess
  error?: string
}
const running = new Map<string, Running>()

function confDir(): string {
  const dir = join(app.getPath('userData'), 'vpn')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/** Write a wireproxy config = the WireGuard config + a [Socks5] bind section. */
function writeRuntimeConf(cfg: VpnConfig): string {
  const wg = rawConfig(cfg.id) ?? ''
  const body = `${wg.trim()}\n\n[Socks5]\nBindAddress = 127.0.0.1:${cfg.socksPort}\n`
  const path = join(confDir(), `${cfg.id}.conf`)
  writeFileSync(path, body, 'utf-8')
  return path
}

function startConfig(id: string): VpnConfigStatus {
  const cfg = listConfigs().find((c) => c.id === id)
  if (!cfg) throw new Error('Unknown VPN config')
  const bin = findBinary()
  if (!bin) return { ...cfg, running: false, error: 'wireproxy binary not found' }
  if (running.has(id)) return { ...cfg, running: true }

  const confPath = writeRuntimeConf(cfg)
  const child = spawn(bin, ['-c', confPath], { stdio: ['ignore', 'pipe', 'pipe'] })
  const rec: Running = { child }
  running.set(id, rec)

  let stderr = ''
  child.stderr?.on('data', (d) => {
    stderr = (stderr + String(d)).slice(-2000)
  })
  child.on('exit', (code) => {
    running.delete(id)
    if (code && code !== 0) rec.error = stderr.trim().split('\n').pop() || `exited (${code})`
    broadcast()
  })
  child.on('error', (e) => {
    running.delete(id)
    rec.error = String(e?.message ?? e)
    broadcast()
  })
  // Give the listener a tick to fail fast (e.g. bad config) before reporting up.
  return { ...cfg, running: true }
}

function stopConfig(id: string): VpnConfigStatus {
  const rec = running.get(id)
  if (rec) {
    try {
      rec.child.kill()
    } catch {
      /* already gone */
    }
    running.delete(id)
  }
  const cfg = listConfigs().find((c) => c.id === id)
  return { ...(cfg as VpnConfig), running: false }
}

function statuses(): VpnConfigStatus[] {
  return listConfigs().map((c) => ({ ...c, running: running.has(c.id), error: running.get(c.id)?.error }))
}

function state(): VpnState {
  const bin = findBinary()
  return { binaryPresent: !!bin, binaryPath: bin ?? undefined, configs: statuses() }
}

function broadcast(): void {
  const s = state()
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('vpn:status', s)
  }
}

// ---------- per-session proxy binding ----------
/** Sessions we've pinned to a proxy — used to also force WebRTC through it. */
const proxiedSessions = new Set<Session>()

function bindWebRtc(ses: Session): void {
  for (const wc of webContents.getAllWebContents()) {
    if (wc.session === ses) {
      try {
        wc.setWebRTCIPHandlingPolicy('disable_non_proxied_udp')
      } catch {
        /* not a guest that supports it */
      }
    }
  }
}

/** Re-pin every persona's session partition to its assigned exit, or direct.
 *  Fail-closed: a persona with an exit is pinned even if its tunnel is down. */
export function applyPersonaProxies(): void {
  const personas = all<Persona & Record<string, unknown>>('SELECT partition, vpnConfigId FROM personas')
  const byId = new Map(listConfigs().map((c) => [c.id, c]))
  for (const p of personas) {
    const partition = String(p.partition)
    if (!partition) continue
    const ses = session.fromPartition(partition)
    const cfgId = (p.vpnConfigId as string) ?? null
    const cfg = cfgId ? byId.get(cfgId) : undefined
    if (cfg) {
      ses.setProxy({ proxyRules: `socks5://127.0.0.1:${cfg.socksPort}` }).catch(() => {})
      proxiedSessions.add(ses)
      bindWebRtc(ses)
    } else {
      proxiedSessions.delete(ses)
      ses.setProxy({ mode: 'direct' }).catch(() => {})
    }
  }
}

// ---------- lifecycle ----------
export function initVpn(): void {
  // Force WebRTC through the proxy for any guest <webview> in a proxied session.
  app.on('web-contents-created', (_e, contents) => {
    if (contents.getType() !== 'webview') return
    if (proxiedSessions.has(contents.session)) {
      try {
        contents.setWebRTCIPHandlingPolicy('disable_non_proxied_udp')
      } catch {
        /* ignore */
      }
    }
  })

  // Bring tunnels up at launch, then pin persona sessions.
  if (findBinary()) {
    for (const c of listConfigs()) {
      try {
        startConfig(c.id)
      } catch {
        /* reported via status */
      }
    }
  }
  applyPersonaProxies()
  registerVpnHandlers()
}

function registerVpnHandlers(): void {
  ipcMain.handle('vpn:state', () => state())

  ipcMain.handle('vpn:import', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showOpenDialog(win!, {
      title: 'Import Proton WireGuard config(s)',
      filters: [{ name: 'WireGuard config', extensions: ['conf'] }],
      properties: ['openFile', 'multiSelections']
    })
    if (res.canceled || res.filePaths.length === 0) return 0
    let count = 0
    for (const fp of res.filePaths) {
      try {
        const text = readFileSync(fp, 'utf-8')
        if (!/\[Interface\]/i.test(text) || !/PrivateKey\s*=/i.test(text)) continue
        const id = randomUUID()
        const base = fp.split(/[\\/]/).pop() ?? 'config'
        const name = base.replace(/\.conf$/i, '')
        run('INSERT INTO vpn_configs (id,name,endpoint,socksPort,config,createdAt) VALUES (?,?,?,?,?,?)', [
          id,
          name,
          parseEndpoint(text),
          nextPort(),
          text,
          Date.now()
        ])
        startConfig(id)
        count++
      } catch {
        /* skip unreadable file */
      }
    }
    applyPersonaProxies()
    broadcast()
    return count
  })

  ipcMain.handle('vpn:rename', (_e, id: string, name: string) => {
    run('UPDATE vpn_configs SET name = ? WHERE id = ?', [name.trim() || 'Unnamed', id])
    broadcast()
  })

  ipcMain.handle('vpn:remove', (_e, id: string) => {
    stopConfig(id)
    run('DELETE FROM vpn_configs WHERE id = ?', [id])
    run('UPDATE personas SET vpnConfigId = NULL WHERE vpnConfigId = ?', [id])
    try {
      unlinkSync(join(confDir(), `${id}.conf`))
    } catch {
      /* no runtime file */
    }
    applyPersonaProxies()
    broadcast()
  })

  ipcMain.handle('vpn:start', (_e, id: string) => {
    const s = startConfig(id)
    applyPersonaProxies()
    broadcast()
    return s
  })
  ipcMain.handle('vpn:stop', (_e, id: string) => {
    const s = stopConfig(id)
    broadcast()
    return s
  })
  ipcMain.handle('vpn:startAll', () => {
    if (!findBinary()) return
    for (const c of listConfigs()) startConfig(c.id)
    applyPersonaProxies()
    broadcast()
  })
  ipcMain.handle('vpn:apply', () => applyPersonaProxies())
}

/** Stop all tunnels (called on quit). */
export function shutdownVpn(): void {
  for (const id of [...running.keys()]) stopConfig(id)
}
