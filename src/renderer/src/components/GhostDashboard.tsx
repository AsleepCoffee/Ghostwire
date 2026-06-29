import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crosshair, ChevronRight, Plus, Workflow, ShieldCheck } from 'lucide-react'
import { api, type Project, type Activity } from '../lib/api'
import { Icon } from './ui'
import { useOpenInBrowser } from '../lib/browserBus'
import { useSettings } from '../lib/settings'
import { PivotModal } from './PivotModal'
import { DashboardGrid } from './DashboardGrid'
import { type WidgetMeta, resolveLayout } from '../lib/dashboard'
import { SUBJECT_LABELS, type PivotSubject } from '../lib/pivot'
import icon from '../assets/icon.png'

/** The GhostWire-mode dashboard widget catalogue (default order + sizes). */
const GHOST_WIDGETS: WidgetMeta[] = [
  { id: 'status', label: 'Investigation status', hint: 'Active case + entity/connection counts', sizes: ['S', 'M', 'L'], defaultSize: 'S' },
  { id: 'clock', label: 'Time (UTC)', hint: 'UTC + local clock', sizes: ['S', 'M'], defaultSize: 'S' },
  { id: 'resources', label: 'Resources', hint: 'Sock puppets, notes, VPN status', sizes: ['S', 'M'], defaultSize: 'S' },
  { id: 'emblem', label: 'Emblem + pivot bar', hint: 'Branded hero with quick pivot', sizes: ['M', 'L'], defaultSize: 'L' },
  { id: 'topEntities', label: 'Top entities', hint: 'Most-connected entities', sizes: ['S', 'M', 'L'], defaultSize: 'M' },
  { id: 'activity', label: 'Recent activity', hint: 'Latest case events', sizes: ['S', 'M', 'L'], defaultSize: 'M' },
  { id: 'quickActions', label: 'Quick actions', hint: 'Common shortcuts', sizes: ['M', 'L'], defaultSize: 'M' },
  { id: 'tools', label: 'Tools', hint: 'External OSINT tools', sizes: ['M', 'L'], defaultSize: 'M' }
]

/** Entity type → a lucide icon name for the HUD readouts. */
const TYPE_ICON: Record<string, string> = {
  person: 'User',
  username: 'AtSign',
  email: 'Mail',
  phone: 'Phone',
  domain: 'Globe',
  ip: 'Server',
  organization: 'Building2',
  location: 'MapPin',
  social: 'Share2',
  image: 'Image',
  document: 'FileText',
  wallet: 'Wallet',
  custom: 'Dot'
}

const TOOLS: { name: string; icon: string; url: string }[] = [
  { name: 'WHOIS', icon: 'Search', url: 'https://who.is/' },
  { name: 'Shodan', icon: 'Radar', url: 'https://www.shodan.io/' },
  { name: 'VirusTotal', icon: 'ShieldAlert', url: 'https://www.virustotal.com/gui/home/search' },
  { name: 'HIBP', icon: 'KeyRound', url: 'https://haveibeenpwned.com/' },
  { name: 'Dehashed', icon: 'Database', url: 'https://dehashed.com/' },
  { name: 'BuiltWith', icon: 'Boxes', url: 'https://builtwith.com/' }
]

function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function GhostDashboard(): JSX.Element {
  const nav = useNavigate()
  const openInBrowser = useOpenInBrowser()
  const { settings, update } = useSettings()
  const [projects, setProjects] = useState<Project[]>([])
  const [counts, setCounts] = useState({ entities: 0, connections: 0 })
  const [resources, setResources] = useState({ personas: 0, notes: 0 })
  const [topEntities, setTopEntities] = useState<{ label: string; type: string; count: number }[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [now, setNow] = useState(() => new Date())
  const [pivot, setPivot] = useState('')
  const [subject, setSubject] = useState<PivotSubject>('generic')
  const [pivotOpen, setPivotOpen] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [projs, boards, personas, notes] = await Promise.all([
        api.projects.list(),
        api.boards.list(),
        api.personas.list(),
        api.notes.list()
      ])
      if (cancelled) return
      setProjects(projs)
      setResources({ personas: personas.length, notes: notes.length })
      let nodes = 0
      let edges = 0
      const tally = new Map<string, { label: string; type: string; count: number }>()
      for (const b of boards) {
        const g = await api.boards.graph(b.id)
        nodes += g.nodes.length
        edges += g.edges.length
        for (const n of g.nodes) {
          if (!n.label?.trim()) continue
          const key = `${n.type}::${n.label.toLowerCase()}`
          const e = tally.get(key) ?? { label: n.label, type: n.type, count: 0 }
          e.count++
          tally.set(key, e)
        }
      }
      if (cancelled) return
      setCounts({ entities: nodes, connections: edges })
      setTopEntities([...tally.values()].sort((a, b) => b.count - a.count).slice(0, 5))
      const pid = settings.activeProjectId ?? [...projs].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id
      if (pid) {
        const acts = await api.activity.list(pid)
        if (!cancelled) setActivity(acts.slice(0, 6))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [settings.activeProjectId])

  const active = useMemo(
    () => projects.find((p) => p.id === settings.activeProjectId) ?? null,
    [projects, settings.activeProjectId]
  )
  const p2 = (n: number): string => String(n).padStart(2, '0')
  const utc = `${now.getUTCFullYear()}-${p2(now.getUTCMonth() + 1)}-${p2(now.getUTCDate())} ${p2(now.getUTCHours())}:${p2(now.getUTCMinutes())}:${p2(now.getUTCSeconds())}`

  const layout = useMemo(() => resolveLayout(GHOST_WIDGETS, settings.dashboardLayout?.ghost), [settings.dashboardLayout])

  const nodes: Record<string, ReactNode> = {
    status: (
      <div className="hud p-4 h-full">
        <div className="hud-label mb-2">Investigation Status</div>
        <div className={`text-lg font-bold ${active ? 'text-ok' : 'text-slate-400'}`}>
          {active ? 'ACTIVE' : 'STANDBY'}
        </div>
        <div className="text-[11px] text-slate-500 truncate mb-3">{active ? active.name : 'No active investigation'}</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: 'Investigations', v: projects.length, to: '/projects' },
            { l: 'Entities', v: counts.entities, to: '/graph' },
            { l: 'Connections', v: counts.connections, to: '/graph' }
          ].map((s) => (
            <button key={s.l} onClick={() => nav(s.to)} className="text-left hover:opacity-80">
              <div className="text-2xl font-bold text-slate-100 hud-num leading-none">{s.v.toLocaleString()}</div>
              <div className="hud-label !text-slate-500 mt-1">{s.l}</div>
            </button>
          ))}
        </div>
      </div>
    ),
    clock: (
      <div className="hud p-4 h-full">
        <div className="hud-label mb-2">Time (UTC)</div>
        <div className="text-2xl font-bold text-slate-100 hud-num">{utc}</div>
        <div className="mt-3 hud-label !text-slate-500">Local</div>
        <div className="text-sm text-slate-300 hud-num">{now.toLocaleTimeString()}</div>
        {active?.timezone && <div className="text-[11px] text-slate-500 mt-1">Case TZ · {active.timezone}</div>}
      </div>
    ),
    resources: (
      <div className="hud p-4 h-full">
        <div className="hud-label mb-2">Resources</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { l: 'Sock Puppets', v: resources.personas, to: '/sock-puppets' },
            { l: 'Notes', v: resources.notes, to: '/notes' }
          ].map((s) => (
            <button key={s.l} onClick={() => nav(s.to)} className="text-left hover:opacity-80">
              <div className="text-2xl font-bold text-slate-100 hud-num leading-none">{s.v.toLocaleString()}</div>
              <div className="hud-label !text-slate-500 mt-1">{s.l}</div>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] border-t border-ink-700 pt-2">
          <span className={`live-dot ${settings.globalVpnConfigId ? '!bg-ok' : '!bg-slate-500'}`} />
          <span className="text-slate-400">{settings.globalVpnConfigId ? 'VPN exit engaged' : 'Direct connection'}</span>
          <button onClick={() => nav('/vpn')} className="ml-auto text-accent-glow hover:underline">
            VPN
          </button>
        </div>
        <button
          onClick={() => nav('/evidence')}
          className="mt-2 text-[11px] text-accent-glow hover:underline flex items-center gap-1"
        >
          <ShieldCheck size={12} /> Evidence locker
        </button>
      </div>
    ),
    emblem: (
      <div className="hud p-8 h-full flex flex-col items-center justify-center text-center min-h-[320px]">
        <img
          src={icon}
          alt="GhostWire"
          className="w-28 h-28 object-contain mb-4"
          style={{ filter: 'drop-shadow(0 0 26px rgb(var(--accent) / 0.55))' }}
        />
        <div className="text-4xl font-black tracking-[0.18em] text-slate-100">GHOSTWIRE</div>
        <div className="hud-label mt-2">OSINT · Investigate · Connect</div>
        <div className="mt-5 w-full max-w-xl flex gap-2">
          <input
            className="input"
            placeholder="email, username, domain, name, IP, phone…"
            value={pivot}
            onChange={(e) => setPivot(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && pivot.trim() && setPivotOpen(true)}
          />
          <select className="input !w-auto" value={subject} onChange={(e) => setSubject(e.target.value as PivotSubject)}>
            {Object.entries(SUBJECT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <button className="btn-primary shrink-0" disabled={!pivot.trim()} onClick={() => setPivotOpen(true)}>
            <Crosshair size={15} /> Pivot
          </button>
        </div>
      </div>
    ),
    topEntities: (
      <div className="hud p-4 h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="hud-label">Top Entities</div>
          <button className="hud-label !text-slate-500 hover:!text-accent-glow" onClick={() => nav('/graph')}>
            Graph →
          </button>
        </div>
        {topEntities.length === 0 ? (
          <div className="text-xs text-slate-500">No entities yet — build a link chart.</div>
        ) : (
          <div className="space-y-2">
            {topEntities.map((e) => (
              <div key={`${e.type}-${e.label}`} className="flex items-center gap-2.5">
                <Icon name={TYPE_ICON[e.type] ?? 'Dot'} size={14} className="text-accent-glow shrink-0" />
                <span className="text-sm text-slate-200 truncate flex-1 font-mono">{e.label}</span>
                <span className="text-sm font-bold text-slate-100 hud-num">{e.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    activity: (
      <div className="hud p-4 h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="hud-label">Recent Activity</div>
          {active && (
            <button className="hud-label !text-slate-500 hover:!text-accent-glow" onClick={() => nav(`/projects/${active.id}`)}>
              Open →
            </button>
          )}
        </div>
        {activity.length === 0 ? (
          <div className="text-xs text-slate-500">No recorded activity yet.</div>
        ) : (
          <div className="space-y-2.5">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <span className="live-dot mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-200 truncate">{a.message}</div>
                  <div className="hud-label !text-slate-600 mt-0.5">
                    {a.type} · {ago(a.at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    quickActions: (
      <div className="hud p-4 h-full">
        <div className="hud-label mb-3">Quick Actions</div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { l: 'New investigation', i: 'FolderSearch', on: () => nav('/projects') },
            { l: 'Link chart', i: 'Workflow', on: () => nav('/graph') },
            { l: 'Sock puppet', i: 'Drama', on: () => nav('/sock-puppets') },
            { l: 'Domain recon', i: 'Radar', on: () => nav('/recon') },
            { l: 'Browser', i: 'Globe', on: () => openInBrowser(['https://www.google.com/']) },
            { l: 'Tools', i: 'Wrench', on: () => nav('/tools') }
          ].map((a) => (
            <button
              key={a.l}
              onClick={a.on}
              className="rounded-lg border border-ink-700 bg-ink-900/40 hover:border-accent/40 p-3 flex flex-col items-center gap-1.5 transition-colors"
            >
              <Icon name={a.i} size={18} className="text-accent-glow" />
              <span className="text-[11px] text-slate-300">{a.l}</span>
            </button>
          ))}
        </div>
      </div>
    ),
    tools: (
      <div className="hud p-4 h-full">
        <div className="hud-label mb-3">Tools</div>
        <div className="grid grid-cols-3 gap-2.5">
          {TOOLS.map((t) => (
            <button
              key={t.name}
              onClick={() => openInBrowser([t.url])}
              className="rounded-lg border border-ink-700 bg-ink-900/40 hover:border-accent/40 p-3 flex flex-col items-center gap-1.5 transition-colors"
              title={`Open ${t.name}`}
            >
              <Icon name={t.icon} size={18} className="text-accent-glow" />
              <span className="text-[11px] text-slate-300">{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1600px] mx-auto p-6">
        <DashboardGrid
          meta={GHOST_WIDGETS}
          layout={layout}
          nodes={nodes}
          onChange={(next) => update({ dashboardLayout: { ...settings.dashboardLayout, ghost: next } })}
        />

        <div className="flex items-center justify-center gap-2 pt-5 text-[11px] text-slate-600">
          <button className="hover:text-accent-glow flex items-center gap-1" onClick={() => nav('/projects')}>
            <Plus size={12} /> New investigation
          </button>
          <span>·</span>
          <button className="hover:text-accent-glow flex items-center gap-1" onClick={() => nav('/graph')}>
            <Workflow size={12} /> Link analysis
          </button>
          <span>·</span>
          <button className="hover:text-accent-glow flex items-center gap-1" onClick={() => nav('/settings')}>
            Appearance <ChevronRight size={11} />
          </button>
        </div>
      </div>

      <PivotModal open={pivotOpen} onClose={() => setPivotOpen(false)} subject={subject} value={pivot} />
    </div>
  )
}
