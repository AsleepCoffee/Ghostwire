import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft } from 'lucide-react'
import { api, type Project, type Persona, type ToolLink } from '../lib/api'
import { useOpenInBrowser } from '../lib/browserBus'
import { useSettings } from '../lib/settings'
import { Icon } from './ui'

interface Command {
  id: string
  label: string
  hint?: string
  group: string
  icon: string
  run: () => void
}

/** Global ⌘/Ctrl-K launcher: jump to any page, investigation, persona or tool. */
export function CommandPalette(): JSX.Element | null {
  const nav = useNavigate()
  const openInBrowser = useOpenInBrowser()
  const { settings } = useSettings()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [tools, setTools] = useState<ToolLink[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Toggle on ⌘/Ctrl-K (and close on Escape). Also open via a custom event so
  // the Topbar search hint (or anything else) can launch it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    const onOpenEvt = (): void => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('gw:command', onOpenEvt)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('gw:command', onOpenEvt)
    }
  }, [])

  // Load context when opened.
  useEffect(() => {
    if (!open) return
    setQ('')
    setActive(0)
    api.projects.list().then(setProjects)
    api.personas.list().then(setPersonas)
    api.tools.list().then(setTools)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const go = (to: string): (() => void) => () => {
    nav(to)
    setOpen(false)
  }
  const launchTool = (t: ToolLink): (() => void) => () => {
    const url = t.url.replace('{QUERY}', '')
    if (t.openMode === 'external') api.shell.openExternal(url)
    else openInBrowser([url])
    setOpen(false)
  }

  const commands = useMemo<Command[]>(() => {
    const navItems: [string, string, string][] = [
      ['/', 'Dashboard', 'LayoutDashboard'],
      ['/guide', 'Guide — how it works', 'BookOpen'],
      ['/projects', 'Investigations', 'FolderSearch'],
      ['/graph', 'Graph Workspace', 'Workflow'],
      ['/evidence', 'Evidence Board', 'Images'],
      ['/map', 'Map', 'Map'],
      ['/timeline', 'Case Timeline', 'History'],
      ['/notes', 'Notes', 'NotebookPen'],
      ['/sock-puppets', 'Sock Puppets', 'Drama'],
      ['/browser', 'Browser', 'Globe'],
      ['/mailbox', 'Mailbox', 'Mail'],
      ['/vpn', 'VPN', 'Shield'],
      ['/enumerate', 'Account Finder', 'ScanSearch'],
      ['/intel', 'Email & Phone Intelligence', 'UserSearch'],
      ['/infra', 'Domain & Infrastructure', 'Server'],
      ['/cross-ref', 'Cross-Reference Images', 'Layers'],
      ['/co-locate', 'Proximity Search', 'Crosshair'],
      ['/fb-id', 'Profile ID (Facebook / Instagram)', 'Fingerprint'],
      ['/wireless', 'Wireless (WiGLE)', 'Wifi'],
      ['/dork', 'Dork & Pivot', 'Binoculars'],
      ['/tools', 'Tools & Resources', 'Wrench'],
      ['/exam-prep', 'PORP Exam Prep', 'GraduationCap'],
      ['/settings', 'Settings', 'Settings']
    ]
    const out: Command[] = navItems.map(([to, label, icon]) => ({
      id: `go${to}`,
      label,
      group: 'Go to',
      icon,
      run: go(to)
    }))
    out.push(
      { id: 'new-proj', label: 'New investigation', group: 'Create', icon: 'FolderPlus', run: go('/projects') },
      { id: 'new-persona', label: 'New sock puppet', group: 'Create', icon: 'Drama', run: go('/sock-puppets') },
      { id: 'new-chart', label: 'New link chart', group: 'Create', icon: 'Workflow', run: go('/graph') }
    )
    // Report export for the active investigation.
    const activeId = settings.activeProjectId
    if (activeId) {
      const name = projects.find((p) => p.id === activeId)?.name
      const exp = (kind: 'pdf' | 'html' | 'md', label: string): Command => ({
        id: `rep-${kind}`,
        label,
        hint: name,
        group: 'Report (active investigation)',
        icon: 'FileDown',
        run: () => {
          setOpen(false)
          if (kind === 'pdf') api.projects.exportReportPdf(activeId)
          else if (kind === 'html') api.projects.exportReportHtml(activeId)
          else api.projects.exportReport(activeId)
        }
      })
      out.push(exp('pdf', 'Export report — PDF'), exp('html', 'Export report — HTML'), exp('md', 'Export report — Markdown'))
    }
    for (const p of projects)
      out.push({ id: `p${p.id}`, label: p.name, hint: p.subject, group: 'Investigations', icon: 'FolderSearch', run: go(`/projects/${p.id}`) })
    for (const pa of personas)
      out.push({
        id: `pa${pa.id}`,
        label: pa.name,
        hint: `@${pa.handle}`,
        group: 'Personas',
        icon: 'Drama',
        run: () => {
          openInBrowser(['https://duckduckgo.com/'], pa.id)
          setOpen(false)
        }
      })
    for (const t of tools)
      out.push({ id: `t${t.id}`, label: t.name, hint: t.category, group: 'Tools', icon: 'Wrench', run: launchTool(t) })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, personas, tools, settings.activeProjectId])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return commands.slice(0, 40)
    const scored = commands
      .map((c) => {
        const hay = `${c.label} ${c.hint ?? ''} ${c.group}`.toLowerCase()
        const idx = hay.indexOf(s)
        return idx >= 0 ? { c, score: idx + (c.label.toLowerCase().startsWith(s) ? -100 : 0) } : null
      })
      .filter(Boolean) as { c: Command; score: number }[]
    return scored.sort((a, b) => a.score - b.score).map((x) => x.c).slice(0, 40)
  }, [q, commands])

  useEffect(() => {
    setActive(0)
  }, [q])
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      filtered[active]?.run()
    }
  }

  // Group while preserving filtered order.
  const groups: [string, Command[]][] = []
  for (const c of filtered) {
    const g = groups.find(([name]) => name === c.group)
    if (g) g[1].push(c)
    else groups.push([c.group, [c]])
  }
  let runningIdx = -1

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 backdrop-blur-sm p-6 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-xl card !bg-ink-850 shadow-2xl overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-ink-700">
          <Search size={16} className="text-slate-500" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-slate-100 placeholder:text-slate-500"
            placeholder="Search investigations, personas, tools, pages…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="text-[10px] text-slate-500 border border-ink-600 rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">No matches</div>
          ) : (
            groups.map(([group, items]) => (
              <div key={group}>
                <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest text-slate-600">{group}</div>
                {items.map((c) => {
                  runningIdx++
                  const idx = runningIdx
                  return (
                    <button
                      key={c.id}
                      data-idx={idx}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => c.run()}
                      className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm ${idx === active ? 'bg-brand/15 text-slate-100' : 'text-slate-300 hover:bg-ink-800'}`}
                    >
                      <Icon name={c.icon} size={15} className="text-slate-400 shrink-0" />
                      <span className="truncate">{c.label}</span>
                      {c.hint && <span className="text-xs text-slate-500 truncate">· {c.hint}</span>}
                      {idx === active && <CornerDownLeft size={13} className="ml-auto text-slate-500 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
