import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Camera, Sparkles, FileDown, NotebookPen, Activity as ActivityIcon } from 'lucide-react'
import { api, type Activity, type Project } from '../lib/api'
import { useSettings } from '../lib/settings'
import { fmtDate, fmtDateTime } from '../lib/format'
import { EmptyState } from '../components/ui'
import { RequireCase } from '../components/RequireCase'

const TYPE_ICON: Record<string, typeof Camera> = {
  evidence: Camera,
  transform: Sparkles,
  report: FileDown,
  note: NotebookPen
}
const iconFor = (t: string): typeof Camera => TYPE_ICON[t] ?? ActivityIcon

export function Timeline(): JSX.Element {
  return (
    <RequireCase feature="The Case Timeline">
      <TimelineInner />
    </RequireCase>
  )
}

function TimelineInner(): JSX.Element {
  const { settings, update } = useSettings()
  const nav = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string | null>(settings.activeProjectId ?? null)
  const [items, setItems] = useState<Activity[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    api.projects.list().then(setProjects)
  }, [])
  useEffect(() => {
    if (projectId) api.activity.list(projectId).then(setItems)
    else setItems([])
  }, [projectId])

  const types = useMemo(() => Array.from(new Set(items.map((i) => i.type))).sort(), [items])
  const filtered = useMemo(
    () => items.filter((i) => filter === 'all' || i.type === filter).sort((a, b) => b.at - a.at),
    [items, filter]
  )

  // Group chronologically by day.
  const groups = useMemo(() => {
    const m = new Map<string, Activity[]>()
    for (const it of filtered) {
      const day = fmtDate(it.at)
      if (!m.has(day)) m.set(day, [])
      m.get(day)!.push(it)
    }
    return Array.from(m.entries())
  }, [filtered])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-ink-700">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <History size={20} className="text-brand-glow" /> Case Timeline
          </h1>
          <p className="text-sm text-slate-500">Every action on an investigation, in order — captures, transforms, reports and more.</p>
        </div>
        <select
          className="input !w-auto ml-auto"
          value={projectId ?? ''}
          onChange={(e) => {
            const v = e.target.value
            setProjectId(v)
            update({ activeProjectId: v })
          }}
          title="Active investigation"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {projectId && types.length > 0 && (
        <div className="px-6 py-2.5 border-b border-ink-700 flex flex-wrap items-center gap-1.5">
          <Chip label={`All (${items.length})`} on={filter === 'all'} onClick={() => setFilter('all')} />
          {types.map((t) => (
            <Chip key={t} label={`${t} (${items.filter((i) => i.type === t).length})`} on={filter === t} onClick={() => setFilter(t)} />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {!projectId ? (
          <EmptyState icon="History" title="Pick an investigation" subtitle="Choose an investigation above to see its activity timeline." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="History"
            title="No activity yet"
            subtitle="Capture evidence, run transforms, or export a report and it'll appear here."
            action={
              <button className="btn-primary" onClick={() => nav(`/projects/${projectId}`)}>
                Open investigation
              </button>
            }
          />
        ) : (
          <div className="max-w-3xl">
            {groups.map(([day, entries]) => (
              <div key={day} className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">{day}</div>
                <div className="relative border-l border-ink-700 ml-3 pl-6 space-y-3">
                  {entries.map((e) => {
                    const I = iconFor(e.type)
                    return (
                      <div key={e.id} className="relative">
                        <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-ink-850 border border-ink-700 flex items-center justify-center">
                          <I size={12} className="text-brand-glow" />
                        </span>
                        <div className="card p-3">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-ink-800 text-[10px] uppercase tracking-wider text-slate-400">{e.type}</span>
                            <span className="text-[11px] text-slate-500 ml-auto tabular-nums">{fmtDateTime(e.at)}</span>
                          </div>
                          <div className="text-sm text-slate-200 mt-1">{e.message}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
        on ? 'bg-brand/15 text-brand-glow border-brand/30' : 'border-ink-700 text-slate-400 hover:bg-ink-800'
      }`}
    >
      {label}
    </button>
  )
}
