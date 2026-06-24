import { useEffect, useMemo, useState } from 'react'
import { Crosshair, ExternalLink, LayoutGrid, CheckSquare, Square } from 'lucide-react'
import { Modal } from './ui'
import { api, type Persona } from '../lib/api'
import { generatePivots, SUBJECT_LABELS, type PivotSubject } from '../lib/pivot'
import { integrationQueriesFor } from '../lib/apiServices'
import { useOpenInBrowser } from '../lib/browserBus'
import { useSettings } from '../lib/settings'
import { personaColor } from '../lib/constants'

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
  const openInBrowser = useOpenInBrowser()
  const { settings } = useSettings()

  useEffect(() => {
    setSubj(subject)
    setVal(value)
  }, [subject, value, open])

  useEffect(() => {
    if (open) api.personas.list().then(setPersonas)
  }, [open])

  const queries = useMemo(() => {
    const base = generatePivots(subj, val)
    const apiTools = integrationQueriesFor(subj, val, settings.apiKeys ?? {})
    return [...apiTools, ...base]
  }, [subj, val, settings.apiKeys])

  // Select all by default whenever the query set changes.
  useEffect(() => {
    setSelected(new Set(queries.map((q) => q.url)))
  }, [queries])

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

  const openExternally = (): void => {
    selectedUrls().forEach((u) => api.shell.openExternal(u))
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
                          api.shell.openExternal(q.url)
                        }}
                        className="opacity-50 hover:opacity-100"
                        title="Open externally"
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
            <button className="btn-ghost border border-ink-600" onClick={openExternally} disabled={selected.size === 0}>
              <ExternalLink size={15} /> External
            </button>
            <button className="btn-primary" onClick={openSelected} disabled={selected.size === 0}>
              <LayoutGrid size={15} /> Open {selected.size} in tabs
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
