import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Drama, NotebookPen, Workflow, Target } from 'lucide-react'
import { api, type Project, type ProjectCounts, type ProjectType, type ProjectStatus } from '../lib/api'
import { PROJECT_TYPES } from '../lib/constants'
import { Icon, Modal, StatusBadge, EmptyState } from '../components/ui'

export function Projects(): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [counts, setCounts] = useState<Record<string, ProjectCounts>>({})
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState<Partial<Project> | null>(null)
  const nav = useNavigate()

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
              return (
                <button
                  key={p.id}
                  onClick={() => nav(`/projects/${p.id}`)}
                  className="card p-4 text-left hover:border-brand/40 hover:shadow-glow transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${cfg.color}1f`, border: `1px solid ${cfg.color}44` }}
                    >
                      <Icon name={cfg.icon} size={22} style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-100 truncate">{p.name}</h3>
                        <StatusBadge status={p.status} />
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
                </button>
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
  const save = async (): Promise<void> => onSaved(await api.projects.save(p))

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
        <div>
          <label className="label">What we know</label>
          <textarea
            className="input min-h-[90px] resize-y"
            placeholder="Starting facts, leads, identifiers…"
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
