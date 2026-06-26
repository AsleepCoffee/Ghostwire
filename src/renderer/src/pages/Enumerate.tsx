import { useMemo, useState } from 'react'
import {
  ScanSearch,
  Loader2,
  Check,
  X,
  HelpCircle,
  Workflow,
  Crosshair,
  Globe
} from 'lucide-react'
import { api } from '../lib/api'
import { USERNAME_SITES } from '../lib/pivot'
import { useOpenInBrowser } from '../lib/browserBus'
import { useSettings } from '../lib/settings'
import { PivotModal } from '../components/PivotModal'

type Status = 'checking' | 'found' | 'missing' | 'unknown'
interface Row {
  label: string
  url: string
  status: Status
  code: number
}

const STATUS_RANK: Record<Status, number> = { found: 0, unknown: 1, checking: 2, missing: 3 }

export function Enumerate(): JSX.Element {
  const openInBrowser = useOpenInBrowser()
  const { settings } = useSettings()
  const [input, setInput] = useState('')
  const [handle, setHandle] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [running, setRunning] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [pivotOpen, setPivotOpen] = useState(false)
  const [toast, setToast] = useState('')

  const flash = (m: string): void => {
    setToast(m)
    setTimeout(() => setToast(''), 2800)
  }

  const run = async (): Promise<void> => {
    const u = input.trim().replace(/^@/, '')
    if (!u) return
    setHandle(u)
    setPicked(new Set())
    setRunning(true)
    setRows(USERNAME_SITES.map((s) => ({ label: s.label, url: s.url(u), status: 'checking' as Status, code: 0 })))
    await Promise.all(
      USERNAME_SITES.map(async (s) => {
        const url = s.url(u)
        const code = await api.net.httpStatus(url)
        const status: Status = code >= 200 && code < 300 ? 'found' : code === 404 || code === 410 ? 'missing' : 'unknown'
        setRows((prev) => prev.map((r) => (r.label === s.label ? { ...r, status, code } : r)))
        if (status === 'found') setPicked((prev) => new Set(prev).add(s.label))
      })
    )
    setRunning(false)
  }

  const sorted = useMemo(() => [...rows].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.label.localeCompare(b.label)), [rows])
  const found = rows.filter((r) => r.status === 'found').length
  const checking = rows.filter((r) => r.status === 'checking').length

  const toggle = (label: string): void =>
    setPicked((prev) => {
      const n = new Set(prev)
      n.has(label) ? n.delete(label) : n.add(label)
      return n
    })

  const addToChart = async (): Promise<void> => {
    const chosen = rows.filter((r) => picked.has(r.label))
    if (chosen.length === 0) return
    const projectId = settings.activeProjectId ?? null
    const boards = await api.boards.list()
    let board = boards.find((b) => b.projectId === projectId) ?? boards.find((b) => !projectId && !b.projectId)
    if (!board) board = await api.boards.save({ name: `${handle} — accounts`, projectId })
    // Anchor username node, then a social node per found site, linked to it.
    const anchor = await api.boards.saveNode({ boardId: board.id, type: 'username', label: handle, props: {}, x: 0, y: 0 })
    let i = 0
    for (const r of chosen) {
      const node = await api.boards.saveNode({
        boardId: board.id,
        type: 'social',
        label: `${r.label}: ${handle}`,
        props: { url: r.url, status: 'found' },
        x: 280,
        y: (i - (chosen.length - 1) / 2) * 80
      })
      await api.boards.saveEdge({ boardId: board.id, source: anchor.id, target: node.id, label: 'account' })
      i++
    }
    flash(`Added ${chosen.length} account${chosen.length === 1 ? '' : 's'} to the link chart`)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-ink-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <ScanSearch size={20} className="text-brand-glow" /> Account Finder
        </h1>
        <p className="text-sm text-slate-500">Check a username across {USERNAME_SITES.length} platforms at once, then drop the hits onto your link chart.</p>
      </div>

      <div className="px-6 py-3 border-b border-ink-700 flex items-center gap-2">
        <div className="relative flex-1 max-w-lg">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">@</span>
          <input
            className="input pl-7"
            placeholder="username (without @)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !running && run()}
            autoFocus
          />
        </div>
        <button className="btn-primary" onClick={run} disabled={!input.trim() || running}>
          {running ? <Loader2 size={16} className="animate-spin" /> : <ScanSearch size={16} />} Check
        </button>
        {handle && (
          <button className="btn-ghost border border-ink-600" onClick={() => setPivotOpen(true)} title="Open broader pivots for this username">
            <Crosshair size={15} /> Pivot
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <div className="px-6 py-2.5 border-b border-ink-700 flex items-center gap-3 text-sm">
          <span className="text-ok flex items-center gap-1"><Check size={14} /> {found} found</span>
          {checking > 0 && <span className="text-slate-400 flex items-center gap-1"><Loader2 size={13} className="animate-spin" /> {checking} checking</span>}
          <span className="text-slate-500">· {picked.size} selected</span>
          <button className="btn-primary !py-1 ml-auto text-xs" disabled={picked.size === 0} onClick={addToChart}>
            <Workflow size={14} /> Add {picked.size} to link chart
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {rows.length === 0 ? (
          <div className="text-center text-slate-500 mt-20">
            <ScanSearch size={32} className="mx-auto mb-3 text-slate-600" />
            Enter a username and hit Check to probe every platform.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sorted.map((r) => {
              const on = picked.has(r.label)
              return (
                <div
                  key={r.label}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
                    r.status === 'found' ? 'border-ok/30 bg-ok/5' : 'border-ink-700'
                  }`}
                >
                  {r.status === 'checking' ? (
                    <Loader2 size={15} className="animate-spin text-slate-500 shrink-0" />
                  ) : r.status === 'found' ? (
                    <Check size={15} className="text-ok shrink-0" />
                  ) : r.status === 'missing' ? (
                    <X size={15} className="text-slate-600 shrink-0" />
                  ) : (
                    <HelpCircle size={15} className="text-warn shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-200 truncate">{r.label}</div>
                    <div className="text-[11px] text-slate-500">
                      {r.status === 'found' ? 'Profile exists' : r.status === 'missing' ? 'Not found' : r.status === 'unknown' ? `Unclear (HTTP ${r.code || '—'})` : 'Checking…'}
                    </div>
                  </div>
                  {r.status !== 'checking' && r.status !== 'missing' && (
                    <>
                      <button className="btn-ghost !p-1.5" title="Open profile in browser" onClick={() => openInBrowser([r.url])}>
                        <Globe size={14} />
                      </button>
                      <input type="checkbox" className="accent-brand" checked={on} onChange={() => toggle(r.label)} title="Select for link chart" />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <p className="text-[11px] text-slate-600 mt-4">
          “Unclear” means the site blocked the check or doesn’t return a clean 404 — open it to confirm manually. Results are best-effort.
        </p>
      </div>

      <PivotModal open={pivotOpen} onClose={() => setPivotOpen(false)} subject="username" value={handle} />

      {toast && (
        <div className="absolute bottom-5 right-5 z-40 card px-4 py-2.5 text-sm text-slate-200 border-accent/40 shadow-xl">{toast}</div>
      )}
    </div>
  )
}
