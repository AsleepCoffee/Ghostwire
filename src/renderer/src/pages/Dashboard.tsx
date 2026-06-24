import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderSearch,
  Drama,
  Wrench,
  NotebookPen,
  ChevronRight,
  Plus,
  Fingerprint,
  Save,
  FileDown,
  Crosshair,
  Workflow,
  Binoculars,
  Globe
} from 'lucide-react'
import { api, type Persona, type Note, type ToolLink, type Project } from '../lib/api'
import { personaColor, PROJECT_TYPES } from '../lib/constants'
import { Icon, StatusBadge, Panel } from '../components/ui'
import { useOpenInBrowser } from '../lib/browserBus'
import { PivotModal } from '../components/PivotModal'
import { SUBJECT_LABELS, type PivotSubject } from '../lib/pivot'

const CATEGORY_ICON: Record<string, string> = {
  Search: 'Search',
  Username: 'AtSign',
  'Email & Breach': 'Mail',
  Infrastructure: 'Server',
  Domain: 'Globe',
  'Image & Face': 'Image',
  'Geo & Maps': 'MapPin',
  Social: 'Share2',
  Toolkits: 'Boxes',
  General: 'Wrench'
}

export function Dashboard(): JSX.Element {
  const nav = useNavigate()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [tools, setTools] = useState<ToolLink[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const openInBrowser = useOpenInBrowser()

  const launchTool = (t: ToolLink): void => {
    const url = t.url.replace('{QUERY}', '')
    if (t.openMode === 'external') api.shell.openExternal(url)
    else openInBrowser([url])
  }

  useEffect(() => {
    api.personas.list().then(setPersonas)
    api.notes.list().then(setNotes)
    api.tools.list().then(setTools)
    api.projects.list().then(setProjects)
  }, [])

  const stats = [
    { label: 'Investigations', value: projects.length, icon: FolderSearch, to: '/projects', color: '#60a5fa' },
    { label: 'Sock Puppets', value: personas.length, icon: Drama, to: '/sock-puppets', color: '#a78bfa' },
    { label: 'Tools', value: tools.length, icon: Wrench, to: '/tools', color: '#22d3ee' },
    { label: 'Notes', value: notes.length, icon: NotebookPen, to: '/notes', color: '#f59e0b' }
  ]

  const featuredTools = tools.filter((t) => t.builtin).slice(0, 10)

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-5">
        {/* Top row */}
        <div className="grid grid-cols-12 gap-5">
          {/* Welcome + stats */}
          <div className="col-span-12 xl:col-span-5">
            <div className="card p-6 h-full bg-gradient-to-br from-ink-850 to-ink-900 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand/10 blur-2xl" />
              <p className="text-slate-400 text-sm">Welcome back,</p>
              <h1 className="text-3xl font-bold text-slate-100 mt-1">Researcher 👋</h1>
              <p className="text-slate-500 text-sm mt-1.5">
                Your OSINT command center — personas, tools, notes, and link analysis in one place.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-6">
                {stats.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => nav(s.to)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-ink-800/70 border border-ink-700 hover:border-ink-500 transition-colors text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${s.color}1f` }}
                    >
                      <s.icon size={20} style={{ color: s.color }} />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-slate-100 leading-none">{s.value}</div>
                      <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent investigations */}
          <div className="col-span-12 md:col-span-7 xl:col-span-4">
            <Panel
              title="Recent Investigations"
              className="h-full"
              action={
                <button className="text-xs text-brand-glow hover:underline" onClick={() => nav('/projects')}>
                  View all
                </button>
              }
              bodyClassName="overflow-y-auto"
            >
              {projects.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  No investigations yet.{' '}
                  <button className="text-brand-glow hover:underline" onClick={() => nav('/projects')}>
                    Start one
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-ink-800">
                  {projects.slice(0, 6).map((pr) => {
                    const cfg = PROJECT_TYPES[pr.type]
                    return (
                      <button
                        key={pr.id}
                        onClick={() => nav(`/projects/${pr.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ink-800 text-left"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${cfg.color}1f` }}
                        >
                          <Icon name={cfg.icon} size={15} style={{ color: cfg.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-200 truncate">{pr.name}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {cfg.label}
                            {pr.subject ? ` · ${pr.subject}` : ''}
                          </div>
                        </div>
                        <StatusBadge status={pr.status} />
                        <ChevronRight size={15} className="text-slate-600" />
                      </button>
                    )
                  })}
                </div>
              )}
            </Panel>
          </div>

          {/* Sock puppets */}
          <div className="col-span-12 md:col-span-5 xl:col-span-3">
            <Panel
              title="Sock Puppets"
              className="h-full"
              action={
                <button className="btn-primary !py-1 !px-2 text-xs" onClick={() => nav('/sock-puppets')}>
                  <Plus size={14} /> New
                </button>
              }
              bodyClassName="overflow-y-auto"
            >
              {personas.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No personas yet.</div>
              ) : (
                <div className="divide-y divide-ink-800">
                  {personas.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openInBrowser(['https://duckduckgo.com/'], p.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ink-800 text-left"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${personaColor(p.id)}22`, border: `1px solid ${personaColor(p.id)}55` }}
                      >
                        <Fingerprint size={17} style={{ color: personaColor(p.id) }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-200 truncate">{p.name}</div>
                        <div className="text-xs text-slate-500 truncate">@{p.handle}</div>
                      </div>
                      <StatusBadge status={p.status} />
                    </button>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>

        {/* Quick tools */}
        <Panel
          title="Quick Tools"
          action={
            <button className="text-xs text-brand-glow hover:underline" onClick={() => nav('/tools')}>
              All tools
            </button>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 p-4">
            {featuredTools.map((t) => (
              <button
                key={t.id}
                onClick={() => launchTool(t)}
                className="flex items-center gap-3 p-3 rounded-xl bg-ink-800/60 border border-ink-700 hover:border-brand/40 hover:shadow-glow transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-ink-850 border border-ink-700 flex items-center justify-center shrink-0">
                  <Icon name={CATEGORY_ICON[t.category] ?? 'Wrench'} size={17} className="text-brand-glow" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">{t.name}</div>
                  <div className="text-xs text-slate-500 truncate">{t.category}</div>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {/* Workspace + quick capture */}
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 xl:col-span-8">
            <QuickStart />
          </div>
          <div className="col-span-12 xl:col-span-4">
            <QuickCapture onFull={() => nav('/notes')} />
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickStart(): JSX.Element {
  const nav = useNavigate()
  const openInBrowser = useOpenInBrowser()
  const [value, setValue] = useState('')
  const [subject, setSubject] = useState<PivotSubject>('generic')
  const [pivotOpen, setPivotOpen] = useState(false)

  const actions = [
    { label: 'New investigation', icon: FolderSearch, onClick: () => nav('/projects') },
    { label: 'New sock puppet', icon: Drama, onClick: () => nav('/sock-puppets') },
    { label: 'New link chart', icon: Workflow, onClick: () => nav('/graph') },
    { label: 'Dork & pivot', icon: Binoculars, onClick: () => nav('/dork') },
    { label: 'Open browser', icon: Globe, onClick: () => openInBrowser(['https://duckduckgo.com/']) },
    { label: 'Tools & resources', icon: Wrench, onClick: () => nav('/tools') }
  ]

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Crosshair size={16} className="text-brand-glow" /> Quick start
        </span>
      }
      className="h-[460px]"
    >
      <div className="p-4 flex flex-col h-full">
        <div className="text-xs text-slate-500 mb-2">
          Drop in something you found — open every relevant lookup at once.
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="email, username, domain, name, IP, phone…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && value.trim() && setPivotOpen(true)}
          />
          <select className="input !w-auto" value={subject} onChange={(e) => setSubject(e.target.value as PivotSubject)}>
            {Object.entries(SUBJECT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <button className="btn-primary shrink-0" disabled={!value.trim()} onClick={() => setPivotOpen(true)}>
            <Crosshair size={15} /> Pivot
          </button>
        </div>

        <div className="text-xs text-slate-500 mt-5 mb-2">Jump to</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1 content-start">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="flex flex-col items-start gap-2 p-3 rounded-xl bg-ink-800/60 border border-ink-700 hover:border-brand/40 hover:shadow-glow transition-all text-left"
            >
              <a.icon size={20} className="text-brand-glow" />
              <span className="text-sm font-medium text-slate-200">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <PivotModal open={pivotOpen} onClose={() => setPivotOpen(false)} subject={subject} value={value} />
    </Panel>
  )
}

function QuickCapture({ onFull }: { onFull: () => void }): JSX.Element {
  const [note, setNote] = useState<Note | null>(null)
  const [body, setBody] = useState('')
  const [saved, setSaved] = useState(false)
  const timer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    api.notes.list().then((list) => {
      const existing = list.find((n) => n.title === 'Quick Capture')
      if (existing) {
        setNote(existing)
        setBody(existing.body)
      }
    })
  }, [])

  const persist = async (text: string): Promise<void> => {
    const n = await api.notes.save({
      id: note?.id,
      title: 'Quick Capture',
      body: text,
      folder: 'Inbox'
    })
    setNote(n)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const onChange = (text: string): void => {
    setBody(text)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => persist(text), 700)
  }

  const exportNote = async (): Promise<void> => {
    if (!note) await persist(body)
    let path = note ? await api.notes.exportOne(note.id) : null
    if (!path) {
      const dir = await api.settings.pickVault()
      if (dir && note) await api.notes.exportOne(note.id)
    }
  }

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Icon name="PenLine" size={16} className="text-brand-glow" /> Quick Capture
        </span>
      }
      action={
        <button className="text-xs text-brand-glow hover:underline" onClick={onFull}>
          Open Notes
        </button>
      }
      className="h-[460px]"
    >
      <div className="flex flex-col h-full">
        <textarea
          className="flex-1 w-full bg-ink-950 text-slate-200 font-mono text-sm p-4 outline-none resize-none rounded-bl-xl"
          placeholder="# Jot down findings…&#10;&#10;Markdown supported. Saved automatically and exportable to Obsidian."
          value={body}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-ink-700">
          <span className="text-xs text-slate-500">{saved ? 'Saved ✓' : 'Autosaves as “Quick Capture”'}</span>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs" onClick={exportNote}>
              <FileDown size={14} /> Export MD
            </button>
            <button className="btn-primary text-xs" onClick={() => persist(body)}>
              <Save size={14} /> Save
            </button>
          </div>
        </div>
      </div>
    </Panel>
  )
}
