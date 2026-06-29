import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderSearch, Plus, FolderOpen } from 'lucide-react'
import { api, type Project } from '../lib/api'
import { useSettings } from '../lib/settings'
import { PROJECT_TYPES } from '../lib/constants'
import { Icon } from './ui'

/** Gate for case-scoped features (Evidence, Timeline, Map, Notes). When no
 *  investigation is active it shows a prompt to create or open one instead of
 *  an empty/confusing view; the feature only renders once a case is active. */
export function RequireCase({ feature, children }: { feature: string; children: ReactNode }): JSX.Element | null {
  const { settings, update } = useSettings()
  const nav = useNavigate()
  const [projects, setProjects] = useState<Project[] | null>(null)

  useEffect(() => {
    api.projects.list().then(setProjects)
  }, [])

  const activeId = settings.activeProjectId ?? null
  // While projects are still loading, trust a set id to avoid flashing the gate.
  const active =
    activeId != null && (projects === null || projects.some((p) => p.id === activeId))

  if (active) return <>{children}</>
  if (projects === null) return null

  const recents = [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6)

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-ink-800 border border-ink-700 flex items-center justify-center mx-auto mb-5">
          <FolderSearch size={30} className="text-brand-glow" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">No active investigation</h2>
        <p className="text-sm text-slate-500 mt-2">
          {feature} is organised per investigation. Create a case or open an existing one to use it — everything you
          capture is then filed under that investigation.
        </p>

        <button className="btn-primary w-full justify-center mt-5" onClick={() => nav('/projects')}>
          <Plus size={16} /> Create an investigation
        </button>

        {recents.length > 0 && (
          <div className="mt-5 text-left">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <FolderOpen size={13} /> Open an existing investigation
            </div>
            <div className="space-y-1.5">
              {recents.map((p) => {
                const cfg = PROJECT_TYPES[p.type]
                return (
                  <button
                    key={p.id}
                    onClick={() => update({ activeProjectId: p.id })}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-ink-700 hover:border-brand/50 hover:bg-ink-800/70 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cfg.color}1f` }}>
                      <Icon name={cfg.icon} size={15} style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-200 truncate">{p.name}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {cfg.label}
                        {p.subject ? ` · ${p.subject}` : ''}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
