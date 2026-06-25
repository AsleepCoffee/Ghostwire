import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Drama, NotebookPen, Workflow, Target, Trash2, Star } from 'lucide-react'
import {
  api,
  type Project,
  type ProjectCounts,
  type ProjectType,
  type ProjectStatus,
  type DataPoint,
  type EntityType
} from '../lib/api'
import { PROJECT_TYPES, ENTITY_TYPES } from '../lib/constants'
import { Icon, Modal, StatusBadge, EmptyState } from '../components/ui'
import { useSettings } from '../lib/settings'

export function Projects(): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [counts, setCounts] = useState<Record<string, ProjectCounts>>({})
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState<Partial<Project> | null>(null)
  const nav = useNavigate()
  const { settings, update } = useSettings()
  const activeId = settings.activeProjectId ?? null

  const load = async (): Promise<void> => {
    setProjects(await api.projects.list())
    setCounts(await api.projects.counts())
  }
  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return projects.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.subject.toLowerCase().includes(q)
    )
  }, [projects, query])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="FolderSearch" size={20} className="text-brand-glow" /> Investigations
          </h1>
          <p className="text-sm text-slate-500">
            One workspace per target — track what you know, what you’re hunting, and everything linked to it.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreating({ type: 'person', status: 'active' })}>
          <Plus size={16} /> New Investigation
        </button>
      </div>

      <div className="px-6 py-3 border-b border-ink-700">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Search investigations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon="FolderSearch"
            title="No investigations yet"
            subtitle="Start one for a person or company to group personas, notes, and link charts together."
            action={
              <button className="btn-primary" onClick={() => setCreating({ type: 'person', status: 'active' })}>
                <Plus size={16} /> New Investigation
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const cfg = PROJECT_TYPES[p.type]
              const c = counts[p.id] ?? { personas: 0, notes: 0, boards: 0 }
              const isActive = p.id === activeId
              return (
                <div
                  key={p.id}
                  onClick={() => nav(`/projects/${p.id}`)}
                  className={`card p-4 text-left cursor-pointer relative transition-all ${
                    isActive ? 'border-brand/70 shadow-glow ring-1 ring-brand/40' : 'hover:border-brand/40 hover:shadow-glow'
                  }`}
                >
                  <button
                    className={`absolute top-3 right-3 p-1 rounded-md transition-colors ${
                      isActive ? 'text-amber-400' : 'text-slate-600 hover:text-slate-300'
                    }`}
                    title={isActive ? 'Active investigation — new evidence/captures file here' : 'Set as active investigation'}
                    onClick={(e) => {
                      e.stopPropagation()
                      update({ activeProjectId: isActive ? null : p.id })
                    }}
                  >
                    <Star size={18} fill={isActive ? 'currentColor' : 'none'} />
                  </button>
                  <div className="flex items-start gap-3 pr-7">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${cfg.color}1f`, border: `1px solid ${cfg.color}44` }}
                    >
                      <Icon name={cfg.icon} size={22} style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-100 truncate">{p.name}</h3>
                        <StatusBadge status={p.status} />
                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border bg-brand/15 text-brand-glow border-brand/30">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {cfg.label}
                        {p.subject ? ` · ${p.subject}` : ''}
                      </div>
                    </div>
                  </div>
                  {p.objectives && (
                    <p className="text-xs text-slate-500 mt-3 line-clamp-2">
                      <Target size={11} className="inline mr-1 -mt-0.5" />
                      {p.objectives}
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-ink-700 flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Drama size={13} /> {c.personas}
                    </span>
                    <span className="flex items-center gap-1">
                      <NotebookPen size={13} /> {c.notes}
                    </span>
                    <span className="flex items-center gap-1">
                      <Workflow size={13} /> {c.boards}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {creating && (
        <ProjectEditor
          initial={creating}
          onClose={() => setCreating(null)}
          onSaved={(saved) => {
            setCreating(null)
            nav(`/projects/${saved.id}`)
          }}
        />
      )}
    </div>
  )
}

export function ProjectEditor({
  initial,
  onClose,
  onSaved
}: {
  initial: Partial<Project>
  onClose: () => void
  onSaved: (p: Project) => void
}): JSX.Element {
  const [p, setP] = useState<Partial<Project>>({ ...initial })
  const set = (patch: Partial<Project>): void => setP((prev) => ({ ...prev, ...patch }))
  const save = async (): Promise<void> => {
    const saved = await api.projects.save(p)
    window.dispatchEvent(new Event('gw:projects-changed'))
    onSaved(saved)
  }

  const points = p.dataPoints ?? []
  const addPoint = (): void =>
    set({ dataPoints: [...points, { id: crypto.randomUUID(), type: 'email', value: '', note: '' }] })
  const updatePoint = (id: string, patch: Partial<DataPoint>): void =>
    set({ dataPoints: points.map((d) => (d.id === id ? { ...d, ...patch } : d)) })
  const removePoint = (id: string): void => set({ dataPoints: points.filter((d) => d.id !== id) })

  return (
    <Modal open onClose={onClose} title={initial.id ? 'Edit investigation' : 'New investigation'} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Investigation name</label>
            <input
              className="input"
              placeholder="e.g. John Doe — fraud lead"
              value={p.name ?? ''}
              onChange={(e) => set({ name: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={p.type ?? 'person'} onChange={(e) => set({ type: e.target.value as ProjectType })}>
              <option value="person">Person</option>
              <option value="company">Company</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={p.status ?? 'active'} onChange={(e) => set({ status: e.target.value as ProjectStatus })}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Subject / target</label>
            <input
              className="input"
              placeholder="The person, company, domain… you're investigating"
              value={p.subject ?? ''}
              onChange={(e) => set({ subject: e.target.value })}
            />
          </div>
        </div>
        {/* Structured known data points */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label !mb-0">Known information</label>
            <button className="btn-ghost text-xs" onClick={addPoint}>
              <Plus size={14} /> Add field
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-2">
            Emails, usernames, domains, phones, etc. You can pivot on these and drop them onto the link chart later.
          </p>
          <div className="space-y-2">
            {points.map((d) => (
              <div key={d.id} className="grid grid-cols-12 gap-2 items-center">
                <select
                  className="input col-span-3 py-1.5 text-sm"
                  value={d.type}
                  onChange={(e) => updatePoint(d.id, { type: e.target.value as EntityType })}
                >
                  {Object.entries(ENTITY_TYPES).map(([t, cfg]) => (
                    <option key={t} value={t}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
                <input
                  className="input col-span-4 py-1.5 text-sm"
                  placeholder="value"
                  value={d.value}
                  onChange={(e) => updatePoint(d.id, { value: e.target.value })}
                />
                <input
                  className="input col-span-4 py-1.5 text-sm"
                  placeholder="note (optional)"
                  value={d.note ?? ''}
                  onChange={(e) => updatePoint(d.id, { note: e.target.value })}
                />
                <button className="btn-danger !px-2 col-span-1 justify-center" onClick={() => removePoint(d.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {points.length === 0 && <p className="text-xs text-slate-500">No data points yet.</p>}
          </div>
        </div>

        <div>
          <label className="label">Notes / context</label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Freeform notes, leads, background…"
            value={p.known ?? ''}
            onChange={(e) => set({ known: e.target.value })}
          />
        </div>
        <div>
          <label className="label">What we’re trying to find</label>
          <textarea
            className="input min-h-[90px] resize-y"
            placeholder="Objectives & questions to answer…"
            value={p.objectives ?? ''}
            onChange={(e) => set({ objectives: e.target.value })}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-ink-700">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" onClick={save} disabled={!p.name?.trim()}>
          {initial.id ? 'Save' : 'Create investigation'}
        </button>
      </div>
    </Modal>
  )
}
