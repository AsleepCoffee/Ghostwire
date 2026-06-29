import { useEffect, useState, type CSSProperties } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, FolderSearch, Command, Minus, Square, Copy, X } from 'lucide-react'

const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
const CMD_LABEL = IS_MAC ? '⌘K' : 'Ctrl K'
const DRAG = { WebkitAppRegion: 'drag' } as unknown as CSSProperties
const NO_DRAG = { WebkitAppRegion: 'no-drag' } as unknown as CSSProperties
import { useOpenInBrowser } from '../lib/browserBus'
import { useSettings } from '../lib/settings'
import { api, type Project } from '../lib/api'

export function Topbar(): JSX.Element {
  const [q, setQ] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [maximized, setMaximized] = useState(false)
  const openInBrowser = useOpenInBrowser()
  const { settings, update } = useSettings()
  const loc = useLocation()

  useEffect(() => {
    api.win.isMaximized().then(setMaximized)
    return api.win.onMaximizeChange(setMaximized)
  }, [])

  // Keep the investigation list fresh: reload on navigation, on window focus,
  // and whenever something signals a project change.
  useEffect(() => {
    const load = (): void => {
      api.projects.list().then(setProjects)
    }
    load()
    window.addEventListener('focus', load)
    window.addEventListener('gw:projects-changed', load)
    return () => {
      window.removeEventListener('focus', load)
      window.removeEventListener('gw:projects-changed', load)
    }
  }, [loc.pathname])

  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!q.trim()) return
    openInBrowser([`https://duckduckgo.com/?q=${encodeURIComponent(q.trim())}`])
    setQ('')
  }

  const ghost = settings.ghostMode === true

  return (
    <header
      className={`relative h-16 shrink-0 flex items-center px-5 ${
        ghost ? 'bg-transparent' : 'border-b border-ink-700 bg-ink-900/60 backdrop-blur'
      }`}
      style={ghost ? DRAG : undefined}
    >
      <div className="w-full max-w-[1200px] mx-auto flex items-center gap-4">
      <form onSubmit={submit} className="flex-1 max-w-xl relative" style={ghost ? NO_DRAG : undefined}>
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

      {/* Command palette launcher — so people discover ⌘K / Ctrl-K */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('gw:command'))}
        style={ghost ? NO_DRAG : undefined}
        className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border border-ink-600 bg-ink-850 text-slate-400 hover:text-slate-100 hover:border-accent/50 transition-colors text-sm"
        title="Command palette — jump to any page, investigation, persona or tool"
      >
        <Command size={14} />
        <span className="hidden md:inline">Jump to…</span>
        <kbd className="text-[10px] text-slate-400 border border-ink-600 rounded px-1.5 py-0.5">{CMD_LABEL}</kbd>
      </button>

      {/* Active investigation — where captures & evidence are filed */}
      <div className="relative shrink-0" style={ghost ? NO_DRAG : undefined} title="Active investigation — new evidence/captures are filed here">
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
      </div>

      {/* In GhostWire mode the dedicated title strip is hidden, so the window
          controls live here at the top-right — in line with the rest of the bar. */}
      {ghost && (
        <div className="absolute right-1 top-0 h-full flex items-stretch" style={NO_DRAG}>
          <button onClick={() => api.win.minimize()} className="w-11 grid place-items-center text-slate-400 hover:bg-ink-700/60 hover:text-slate-100 transition-colors" title="Minimize">
            <Minus size={15} />
          </button>
          <button onClick={() => api.win.toggleMaximize()} className="w-11 grid place-items-center text-slate-400 hover:bg-ink-700/60 hover:text-slate-100 transition-colors" title={maximized ? 'Restore' : 'Maximize'}>
            {maximized ? <Copy size={13} /> : <Square size={13} />}
          </button>
          <button onClick={() => api.win.close()} className="w-11 grid place-items-center text-slate-400 hover:bg-danger hover:text-white transition-colors" title="Close">
            <X size={16} />
          </button>
        </div>
      )}
    </header>
  )
}
