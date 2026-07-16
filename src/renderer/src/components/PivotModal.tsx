import { useEffect, useMemo, useState } from 'react'
import { Crosshair, ExternalLink, LayoutGrid, CheckSquare, Square, KeyRound, Loader2, Check, X } from 'lucide-react'
import { Modal } from './ui'
import { api, type Persona, type DehashedResult } from '../lib/api'
import { generatePivots, SUBJECT_LABELS, type PivotSubject } from '../lib/pivot'
import { integrationQueriesFor } from '../lib/apiServices'
import { useOpenInBrowser } from '../lib/browserBus'
import { useSettings } from '../lib/settings'
import { personaColor } from '../lib/constants'
import { useConfirm } from '../lib/confirm'

/** Map pivot subject type to the DeHashed field name for a targeted query. */
function dehashedQuery(subj: PivotSubject, val: string): string {
  const fieldMap: Partial<Record<PivotSubject, string>> = {
    email: 'email',
    username: 'username',
    name: 'name',
    phone: 'phone',
    ip: 'ip_address',
    domain: 'domain'
  }
  const field = fieldMap[subj]
  return field ? `${field}:"${val}"` : val
}

export function PivotModal({
  open,
  onClose,
  subject,
  value
}: {
  open: boolean
  onClose: () => void
  subject: PivotSubject
  value: string
}): JSX.Element {
  const [subj, setSubj] = useState<PivotSubject>(subject)
  const [val, setVal] = useState(value)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [personaId, setPersonaId] = useState('')
  const [personas, setPersonas] = useState<Persona[]>([])
  const [dehashedResult, setDehashedResult] = useState<DehashedResult | null>(null)
  const [dehashedLoading, setDehashedLoading] = useState(false)
  const openInBrowser = useOpenInBrowser()
  const { settings } = useSettings()
  const confirm = useConfirm()

  useEffect(() => {
    setSubj(subject)
    setVal(value)
    setDehashedResult(null)
  }, [subject, value, open])

  const searchDehashed = async (): Promise<void> => {
    const key = settings.apiKeys?.dehashed
    if (!key) return
    const balance = await api.intel.dehashedBalance(key).catch(() => null)
    const balanceText =
      balance != null
        ? `You have ${balance} credit${balance === 1 ? '' : 's'} remaining.`
        : 'Your current balance is unknown (it will update after the search).'
    const go = await confirm({
      title: 'Search DeHashed? (costs 1 credit)',
      message: `${balanceText} This will cost 1 credit.`,
      confirmText: 'Search (use 1 credit)',
      cancelText: 'Skip'
    })
    if (!go) return
    setDehashedLoading(true)
    try {
      const result = await api.intel.dehashed(dehashedQuery(subj, val), key)
      setDehashedResult(result)
    } finally {
      setDehashedLoading(false)
    }
  }

  // Load personas and default to the sock puppet assigned to the active
  // investigation — so pivots browse as that persona (and through its VPN exit).
  useEffect(() => {
    if (!open) return
    api.personas.list().then((list) => {
      setPersonas(list)
      const assigned = list.find((p) => p.projectId && p.projectId === settings.activeProjectId)
      setPersonaId(assigned?.id ?? '')
    })
  }, [open, settings.activeProjectId])

  const queries = useMemo(() => {
    const base = generatePivots(subj, val)
    const apiTools = integrationQueriesFor(subj, val, settings.apiKeys ?? {})
    return [...apiTools, ...base]
  }, [subj, val, settings.apiKeys])

  // Select all by default only when the actual set of queries changes — keyed on
  // the URLs (a stable string), not the array identity, which is recreated on
  // every parent re-render (e.g. the dashboard's 1-second clock) and would
  // otherwise keep resetting the selection so you couldn't un-tick anything.
  const queryKey = useMemo(() => queries.map((q) => q.url).join('\n'), [queries])
  useEffect(() => {
    setSelected(new Set(queryKey ? queryKey.split('\n') : []))
  }, [queryKey])

  const groups = useMemo(() => {
    const m = new Map<string, typeof queries>()
    for (const q of queries) {
      if (!m.has(q.group)) m.set(q.group, [])
      m.get(q.group)!.push(q)
    }
    return Array.from(m.entries())
  }, [queries])

  const toggle = (url: string): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(url) ? next.delete(url) : next.add(url)
      return next
    })

  const selectedUrls = (): string[] => queries.filter((q) => selected.has(q.url)).map((q) => q.url)

  const openSelected = (): void => {
    const urls = selectedUrls()
    if (urls.length) openInBrowser(urls, personaId || undefined)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Pivot — search this everywhere" wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Value</label>
            <input className="input" value={val} onChange={(e) => setVal(e.target.value)} />
          </div>
          <div>
            <label className="label">Treat as</label>
            <select className="input" value={subj} onChange={(e) => setSubj(e.target.value as PivotSubject)}>
              {Object.entries(SUBJECT_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selected.size} of {queries.length} queries selected
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs" onClick={() => setSelected(new Set(queries.map((q) => q.url)))}>
              <CheckSquare size={14} /> All
            </button>
            <button className="btn-ghost text-xs" onClick={() => setSelected(new Set())}>
              <Square size={14} /> None
            </button>
          </div>
        </div>

        <div className="max-h-[42vh] overflow-y-auto space-y-3 pr-1">
          {groups.map(([group, items]) => (
            <div key={group}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">{group}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {items.map((q) => {
                  const on = selected.has(q.url)
                  return (
                    <label
                      key={q.url}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer text-sm ${
                        on ? 'bg-brand/10 border-brand/30 text-slate-100' : 'border-ink-700 text-slate-400 hover:bg-ink-800'
                      }`}
                    >
                      <input type="checkbox" className="accent-brand" checked={on} onChange={() => toggle(q.url)} />
                      <span className="truncate flex-1">{q.label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          openInBrowser([q.url], personaId || undefined)
                          onClose()
                        }}
                        className="opacity-50 hover:opacity-100"
                        title="Open just this one in the browser"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* DeHashed API — inline search if key is configured */}
        {settings.apiKeys?.dehashed && (
          <div className="border border-ink-700 rounded-lg">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <KeyRound size={12} className="text-slate-500" />
                DeHashed credential search
              </div>
              {!dehashedResult && (
                <button
                  className="btn-ghost text-xs border border-ink-600"
                  disabled={dehashedLoading}
                  onClick={searchDehashed}
                >
                  {dehashedLoading ? (
                    <><Loader2 size={12} className="animate-spin" /> Searching…</>
                  ) : (
                    'Search API (1 credit)'
                  )}
                </button>
              )}
              {dehashedResult && (
                <button className="btn-ghost text-xs" onClick={() => setDehashedResult(null)}>
                  Clear
                </button>
              )}
            </div>
            {dehashedResult && (
              <div className="border-t border-ink-800 px-3 py-2">
                {!dehashedResult.ok ? (
                  <div className="text-xs text-warn">{dehashedResult.error}</div>
                ) : (dehashedResult.total ?? 0) === 0 ? (
                  <div className="text-xs text-ok flex items-center gap-1"><Check size={12} /> No records found.</div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-danger flex items-center gap-1">
                        <X size={12} /> {dehashedResult.total?.toLocaleString()} record{dehashedResult.total === 1 ? '' : 's'} found
                      </div>
                      {dehashedResult.balance != null && (
                        <span className="text-[10px] text-slate-500">{dehashedResult.balance} credits remaining</span>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-ink-800 border border-ink-800 rounded">
                      {(dehashedResult.entries ?? []).map((entry, i) => (
                        <div key={entry.id || i} className="px-2.5 py-1.5 text-[11px]">
                          {entry.database_name && (
                            <div className="font-medium text-slate-300 mb-0.5">{entry.database_name}</div>
                          )}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-slate-400">
                            {entry.email && <span>email: <span className="text-slate-200">{entry.email}</span></span>}
                            {entry.username && <span>user: <span className="text-slate-200">{entry.username}</span></span>}
                            {entry.password && <span>pw: <span className="text-danger font-mono">{entry.password}</span></span>}
                            {entry.hashed_password && !entry.password && <span>hash: <span className="font-mono text-slate-500">{entry.hashed_password.slice(0, 32)}…</span></span>}
                            {entry.name && <span>name: <span className="text-slate-200">{entry.name}</span></span>}
                            {entry.ip_address && <span>IP: <span className="text-slate-200">{entry.ip_address}</span></span>}
                            {entry.phone && <span>phone: <span className="text-slate-200">{entry.phone}</span></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {(dehashedResult.total ?? 0) > (dehashedResult.entries?.length ?? 0) && (
                      <p className="text-[10px] text-slate-600">
                        Showing first {dehashedResult.entries?.length} of {dehashedResult.total?.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-3 border-t border-ink-700">
          <div className="relative flex-1 max-w-xs">
            <select
              className="input pl-9 py-1.5 text-sm"
              value={personaId}
              onChange={(e) => setPersonaId(e.target.value)}
            >
              <option value="">Default session</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  Browse as {p.name}
                </option>
              ))}
            </select>
            <Crosshair size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
          <div className="ml-auto flex gap-2">
            <button
              className="btn-primary"
              onClick={openSelected}
              disabled={selected.size === 0}
              title="Open inside GhostWire — as the selected persona (and its VPN exit)"
            >
              <LayoutGrid size={15} /> Open {selected.size} in app
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
