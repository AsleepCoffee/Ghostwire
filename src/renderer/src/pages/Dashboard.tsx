import { useEffect, useMemo, useRef, useState } from 'react'
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
  Globe,
  ArrowUpRight,
  Radar,
  PlayCircle
} from 'lucide-react'
import { api, type Persona, type Note, type ToolLink, type Project } from '../lib/api'
import { personaColor, PROJECT_TYPES } from '../lib/constants'
import { Icon, StatusBadge, Panel } from '../components/ui'
import { useOpenInBrowser } from '../lib/browserBus'
import { fmtDate } from '../lib/format'
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
  const resume = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null,
    [projects]
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-5 max-w-[1500px] mx-auto">
        {/* Hero */}
        <Hero activeInvestigations={projects.length} personaCount={personas.length} resume={resume} />

        {/* Stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <button
              key={s.label}
              onClick={() => nav(s.to)}
              style={{ animationDelay: `${i * 60}ms` }}
              className="group card-interactive animate-fade-up p-4 text-left overflow-hidden"
            >
              <span className="sheen" />
              <span
                className="absolute left-0 top-0 h-full w-1 rounded-l-xl transition-all duration-200 group-hover:w-1.5"
                style={{ background: s.color }}
              />
              <div className="flex items-start justify-between">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center ring-1 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: `${s.color}1f`, color: s.color, boxShadow: `inset 0 0 0 1px ${s.color}33` }}
                >
                  <s.icon size={20} />
                </div>
                <ArrowUpRight size={16} className="text-slate-600 group-hover:text-slate-300 transition-colors" />
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-100 leading-none tabular-nums">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1.5 uppercase tracking-wider font-medium">{s.label}</div>
            </button>
          ))}
        </div>

        {/* Quick start */}
        <QuickStart />

        {/* Recent activity — three equal columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Panel
            title="Recent Investigations"
            className="h-80"
            action={
              <button className="text-xs text-brand-glow hover:underline" onClick={() => nav('/projects')}>
                View all
              </button>
            }
            bodyClassName="overflow-y-auto"
          >
            {projects.length === 0 ? (
              <EmptyRow text="No investigations yet" cta="Start one" onClick={() => nav('/projects')} />
            ) : (
              <div className="divide-y divide-ink-800">
                {projects.slice(0, 7).map((pr) => {
                  const cfg = PROJECT_TYPES[pr.type]
                  return (
                    <button
                      key={pr.id}
                      onClick={() => nav(`/projects/${pr.id}`)}
                      className="group w-full flex items-center gap-3 px-4 py-2.5 text-left border-l-2 border-transparent hover:border-brand/60 hover:bg-ink-800/80 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: `${cfg.color}1f` }}>
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
                      <ChevronRight size={15} className="text-slate-600 shrink-0 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  )
                })}
              </div>
            )}
          </Panel>

          <Panel
            title="Sock Puppets"
            className="h-80"
            action={
              <button className="btn-primary !py-1 !px-2 text-xs" onClick={() => nav('/sock-puppets')}>
                <Plus size={14} /> New
              </button>
            }
            bodyClassName="overflow-y-auto"
          >
            {personas.length === 0 ? (
              <EmptyRow text="No personas yet" cta="Create one" onClick={() => nav('/sock-puppets')} />
            ) : (
              <div className="divide-y divide-ink-800">
                {personas.slice(0, 7).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openInBrowser(['https://duckduckgo.com/'], p.id)}
                    className="group w-full flex items-center gap-3 px-4 py-2.5 text-left border-l-2 border-transparent hover:border-brand/60 hover:bg-ink-800/80 transition-colors"
                  >
                    {p.avatarPath ? (
                      <img src={p.avatarPath} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 transition-transform group-hover:scale-110" style={{ border: `1px solid ${personaColor(p.id)}55` }} />
                    ) : (
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ background: `${personaColor(p.id)}22`, border: `1px solid ${personaColor(p.id)}55` }}>
                        <Fingerprint size={17} style={{ color: personaColor(p.id) }} />
                      </div>
                    )}
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

          <Panel
            title="Recent Notes"
            className="h-80"
            action={
              <button className="text-xs text-brand-glow hover:underline" onClick={() => nav('/notes')}>
                View all
              </button>
            }
            bodyClassName="overflow-y-auto"
          >
            {notes.length === 0 ? (
              <EmptyRow text="No notes yet" cta="Create one" onClick={() => nav('/notes')} />
            ) : (
              <div className="divide-y divide-ink-800">
                {notes.slice(0, 7).map((n) => (
                  <button key={n.id} onClick={() => nav('/notes')} className="group w-full flex items-center gap-3 px-4 py-2.5 text-left border-l-2 border-transparent hover:border-brand/60 hover:bg-ink-800/80 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-ink-800 border border-ink-700 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                      <NotebookPen size={15} className="text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-200 truncate">{n.title}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {n.folder} · {fmtDate(n.updatedAt)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Panel>
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
                className="group card-interactive flex items-center gap-3 p-3 text-left overflow-hidden"
              >
                <span className="sheen" />
                <div className="w-9 h-9 rounded-lg bg-ink-850 border border-ink-700 flex items-center justify-center shrink-0 text-brand-glow transition-all duration-200 group-hover:scale-110 group-hover:border-brand/40">
                  <Icon name={CATEGORY_ICON[t.category] ?? 'Wrench'} size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">{t.name}</div>
                  <div className="text-xs text-slate-500 truncate">{t.category}</div>
                </div>
                <ArrowUpRight size={14} className="text-slate-700 group-hover:text-slate-300 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </Panel>

        {/* Quick capture */}
        <QuickCapture onFull={() => nav('/notes')} />
      </div>
    </div>
  )
}

function greetingFor(hour: number): string {
  if (hour < 5) return 'Burning the midnight oil'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function Hero({
  activeInvestigations,
  personaCount,
  resume
}: {
  activeInvestigations: number
  personaCount: number
  resume: Project | null
}): JSX.Element {
  const nav = useNavigate()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const p = (n: number): string => String(n).padStart(2, '0')
  const clock = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`
  const dateLong = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`
  const greeting = greetingFor(now.getHours())

  return (
    <section className="relative overflow-hidden rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-850 via-ink-900 to-ink-950">
      {/* decorative layers */}
      <div className="absolute inset-0 hero-grid pointer-events-none" />
      <div className="absolute -right-24 -top-28 w-80 h-80 rounded-full bg-brand/15 blur-3xl pointer-events-none float-orb" />
      <div className="absolute right-40 top-10 w-56 h-56 rounded-full bg-accent/10 blur-3xl pointer-events-none float-orb-2" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

      <div className="relative p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center gap-8">
        {/* Left: greeting + actions */}
        <div className="flex-1 min-w-0 animate-fade-up">
          <div className="flex items-center gap-2.5 text-[11px] font-mono uppercase tracking-[0.22em] text-slate-400">
            <span className="live-dot" />
            <span className="text-accent-glow">GhostWire</span>
            <span className="text-ink-500">/</span>
            <span>OSINT Workbench</span>
          </div>

          <h1 className="text-3xl lg:text-[2.6rem] font-bold tracking-tight mt-3 leading-tight">
            <span className="text-slate-100">{greeting}, </span>
            <span className="gradient-text">Operator.</span>
          </h1>

          <p className="text-slate-400 text-sm mt-2 max-w-xl">
            {activeInvestigations > 0 ? (
              <>
                You have <b className="text-slate-200">{activeInvestigations}</b>{' '}
                {activeInvestigations === 1 ? 'investigation' : 'investigations'} on the board and{' '}
                <b className="text-slate-200">{personaCount}</b>{' '}
                {personaCount === 1 ? 'persona' : 'personas'} standing by. Pick up where you left off.
              </>
            ) : (
              <>Your unified workspace for investigations, personas, link analysis, tooling and notes. Start your first investigation below.</>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            {resume && (
              <button
                onClick={() => nav(`/projects/${resume.id}`)}
                className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent/15 text-accent-glow border border-accent/30 hover:bg-accent/25 transition-colors text-sm font-medium"
              >
                <PlayCircle size={16} />
                Resume “{resume.name}”
                <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
            <button
              onClick={() => nav('/projects')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-ink-800/80 text-slate-200 border border-ink-600 hover:border-brand/50 hover:bg-ink-800 transition-colors text-sm font-medium"
            >
              <Plus size={16} /> New investigation
            </button>
            <button
              onClick={() => nav('/graph')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-ink-800/80 text-slate-200 border border-ink-600 hover:border-brand/50 hover:bg-ink-800 transition-colors text-sm font-medium"
            >
              <Workflow size={16} /> Link chart
            </button>
          </div>
        </div>

        {/* Right: live ops clock */}
        <div className="glass rounded-2xl px-6 py-5 shrink-0 w-full lg:w-[280px] animate-fade-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Radar size={12} className="text-accent-glow" /> Local time
            </span>
            <span className="text-ok flex items-center gap-1">
              <span className="live-dot !bg-ok" /> Live
            </span>
          </div>
          <div className="mt-3 text-4xl font-bold text-slate-100 tabular-nums tracking-tight">{clock}</div>
          <div className="mt-1.5 text-sm text-slate-400">{dateLong}</div>
        </div>
      </div>
    </section>
  )
}

function EmptyRow({ text, cta, onClick }: { text: string; cta: string; onClick: () => void }): JSX.Element {
  return (
    <div className="p-6 text-center text-sm text-slate-500">
      {text}.{' '}
      <button className="text-brand-glow hover:underline" onClick={onClick}>
        {cta}
      </button>
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
    { label: 'Tools', icon: Wrench, onClick: () => nav('/tools') }
  ]

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Crosshair size={16} className="text-brand-glow" /> Quick start
        </span>
      }
    >
      <div className="p-4 space-y-4">
        <div>
          <div className="text-xs text-slate-500 mb-2">Drop in something you found — open every relevant lookup at once.</div>
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
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="group card-interactive flex flex-col items-start gap-2.5 p-3.5 text-left overflow-hidden"
            >
              <span className="sheen" />
              <span className="w-9 h-9 rounded-lg bg-ink-850 border border-ink-700 flex items-center justify-center text-brand-glow transition-all duration-200 group-hover:scale-110 group-hover:border-brand/40">
                <a.icon size={18} />
              </span>
              <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{a.label}</span>
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
    const n = await api.notes.save({ id: note?.id, title: 'Quick Capture', body: text, folder: 'Inbox' })
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
    const path = note ? await api.notes.exportOne(note.id) : null
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
      className="h-72"
    >
      <div className="flex flex-col h-full">
        <textarea
          className="flex-1 w-full bg-ink-950 text-slate-200 font-mono text-sm p-4 outline-none resize-none"
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
