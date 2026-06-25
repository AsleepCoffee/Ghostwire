import { useEffect, useState } from 'react'
import {
  Plus,
  Loader2,
  Trash2,
  Play,
  Square,
  Pencil,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  DownloadCloud,
  Check
} from 'lucide-react'
import { api, type VpnState, type VpnConfigStatus } from '../lib/api'
import { useSettings } from '../lib/settings'

const WIREPROXY_RELEASES = 'https://github.com/pufferffish/wireproxy/releases'

/** Interactive manager for Proton WireGuard tunnels: import configs, start/stop,
 *  rename, remove. Shared by the Settings → VPN section and the VPN page. */
export function VpnManager({ onChange }: { onChange?: () => void }): JSX.Element {
  const { settings, update } = useSettings()
  const [state, setState] = useState<VpnState | null>(null)
  const [busy, setBusy] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installMsg, setInstallMsg] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const refresh = (): void => {
    api.vpn.state().then(setState)
  }
  useEffect(() => {
    refresh()
    return api.vpn.onStatus((s) => setState(s))
  }, [])

  const installEngine = async (): Promise<void> => {
    setInstalling(true)
    setInstallMsg('')
    try {
      const r = await api.vpn.installEngine()
      setInstallMsg(r.ok ? 'Engine installed ✓' : r.error ?? 'Install failed')
      if (r.ok) onChange?.()
    } finally {
      setInstalling(false)
      refresh()
    }
  }

  const doImport = async (): Promise<void> => {
    setBusy(true)
    try {
      const n = await api.vpn.import()
      if (n > 0) onChange?.()
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const commitName = async (id: string): Promise<void> => {
    await api.vpn.rename(id, editName)
    setEditing(null)
    refresh()
  }

  const configs = state?.configs ?? []
  const binaryMissing = state ? !state.binaryPresent : false

  return (
    <div className="space-y-4">
      {binaryMissing && (
        <div className="rounded-xl border border-warn/40 bg-warn/10 p-4">
          <div className="flex items-center gap-2 text-warn font-medium text-sm">
            <AlertTriangle size={16} /> The tunnel engine isn’t installed yet
          </div>
          <p className="text-sm text-slate-400 mt-2">
            GhostWire routes personas through a tiny userspace helper called <b>wireproxy</b>. Click below and GhostWire
            grabs the right build and installs it for you — no downloads, PATHs, or folders to fuss with.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button className="btn-primary" onClick={installEngine} disabled={installing}>
              {installing ? <Loader2 size={15} className="animate-spin" /> : <DownloadCloud size={15} />}
              {installing ? 'Installing…' : 'Download & install engine'}
            </button>
            <button className="btn-ghost border border-ink-600 text-xs" onClick={() => api.shell.openExternal(WIREPROXY_RELEASES)}>
              <ExternalLink size={14} /> Install manually instead
            </button>
          </div>
          {installMsg && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${installMsg.includes('✓') ? 'text-ok' : 'text-danger'}`}>
              {installMsg.includes('✓') && <Check size={13} />} {installMsg}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {configs.length === 0
            ? 'No exit locations imported yet.'
            : `${configs.length} exit location${configs.length === 1 ? '' : 's'} imported.`}
        </div>
        <button className="btn-primary" onClick={doImport} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Import .conf
        </button>
      </div>

      {configs.length > 0 && (
        <div className="space-y-2">
          {configs.map((c) => (
            <ConfigRow
              key={c.id}
              c={c}
              editing={editing === c.id}
              editName={editName}
              setEditName={setEditName}
              onStartEdit={() => {
                setEditing(c.id)
                setEditName(c.name)
              }}
              onCommit={() => commitName(c.id)}
              onToggle={async () => {
                c.running ? await api.vpn.stop(c.id) : await api.vpn.start(c.id)
                refresh()
              }}
              onRemove={async () => {
                await api.vpn.remove(c.id)
                onChange?.()
                refresh()
              }}
            />
          ))}
        </div>
      )}

      {configs.length > 0 && (
        <div className="rounded-xl border border-ink-700 bg-ink-900/50 p-4">
          <div className="text-sm text-slate-200 font-medium">App-wide exit</div>
          <p className="text-xs text-slate-500 mt-1 mb-2">
            Route the <b>whole app</b> — browsing, lookups, transforms and downloads — through one exit. A persona with its
            own exit still overrides this. Fails closed if the tunnel is down.
          </p>
          <select
            className="input"
            value={settings.globalVpnConfigId ?? ''}
            onChange={async (e) => {
              await update({ globalVpnConfigId: e.target.value || undefined })
              api.vpn.apply().catch(() => {})
            }}
          >
            <option value="">Off — use your real connection</option>
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.running ? '' : ' (tunnel down)'}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

function ConfigRow({
  c,
  editing,
  editName,
  setEditName,
  onStartEdit,
  onCommit,
  onToggle,
  onRemove
}: {
  c: VpnConfigStatus
  editing: boolean
  editName: string
  setEditName: (v: string) => void
  onStartEdit: () => void
  onCommit: () => void
  onToggle: () => void
  onRemove: () => void
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 card !bg-ink-900 p-3">
      <span
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.running ? 'bg-ok shadow-glow' : c.error ? 'bg-danger' : 'bg-ink-600'}`}
        title={c.running ? 'Tunnel up' : c.error ? c.error : 'Stopped'}
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            className="input !py-1 text-sm"
            value={editName}
            autoFocus
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCommit()}
            onBlur={onCommit}
          />
        ) : (
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-brand-glow shrink-0" />
            <span className="text-sm text-slate-200 font-medium truncate">{c.name}</span>
            <button className="text-slate-500 hover:text-slate-300" onClick={onStartEdit} title="Rename">
              <Pencil size={12} />
            </button>
          </div>
        )}
        <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
          {c.endpoint || 'endpoint hidden'} · SOCKS5 127.0.0.1:{c.socksPort}
        </div>
        {c.error && <div className="text-[11px] text-danger truncate mt-0.5">{c.error}</div>}
      </div>
      <button
        className={`btn-ghost border border-ink-600 !px-2 !py-1.5 text-xs ${c.running ? 'text-warn' : 'text-ok'}`}
        onClick={onToggle}
        title={c.running ? 'Stop tunnel' : 'Start tunnel'}
      >
        {c.running ? <Square size={13} /> : <Play size={13} />} {c.running ? 'Stop' : 'Start'}
      </button>
      <button className="btn-danger !px-2 !py-1.5" onClick={onRemove} title="Remove">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

/** Whether at least one tunnel is live — used to gate the VPN page guide. */
export function vpnReady(state: VpnState | null): boolean {
  return !!state && state.binaryPresent && state.configs.some((c) => c.running)
}
