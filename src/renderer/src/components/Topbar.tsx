import { useEffect, useState } from 'react'
import { Search, FolderSearch } from 'lucide-react'
import { useOpenInBrowser } from '../lib/browserBus'
import { useSettings } from '../lib/settings'
import { api, type Project } from '../lib/api'

export function Topbar(): JSX.Element {
  const [q, setQ] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const openInBrowser = useOpenInBrowser()
  const { settings, update } = useSettings()

  useEffect(() => {
    api.projects.list().then(setProjects)
  }, [])

  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!q.trim()) return
    openInBrowser([`https://duckduckgo.com/?q=${encodeURIComponent(q.trim())}`])
    setQ('')
  }

  return (
    <header className="h-16 shrink-0 flex items-center gap-4 px-5 border-b border-ink-700 bg-ink-900/60 backdrop-blur">
      <form onSubmit={submit} className="flex-1 max-w-xl relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the web in the embedded browser…"
          className="input pl-9 pr-16 bg-ink-850"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 border border-ink-600 rounded px-1.5 py-0.5">
          Enter
        </kbd>
      </form>

      {/* Active investigation — where captures & evidence are filed */}
      <div className="relative shrink-0" title="Active investigation — new evidence/captures are filed here">
        <FolderSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-glow pointer-events-none" />
        <select
          className="input !w-auto pl-9 pr-8 py-1.5 text-sm max-w-[220px]"
          value={settings.activeProjectId ?? ''}
          onChange={(e) => update({ activeProjectId: e.target.value || null })}
        >
          <option value="">No active investigation</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  )
}
