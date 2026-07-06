import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from './ui'
import { useSettings } from '../lib/settings'
import { useTutorial } from '../lib/tutorial'
import { api } from '../lib/api'
import iconUrl from '../assets/icon.png'

interface NavItem {
  to: string
  label: string
  icon: string
}

const GROUPS: { heading?: string; items: NavItem[]; toggle?: 'courseNotes' }[] = [
  {
    items: [
      { to: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
      { to: '/guide', label: 'Guide', icon: 'BookOpen' }
    ]
  },
  {
    heading: 'Investigation',
    items: [
      { to: '/projects', label: 'Investigations', icon: 'FolderSearch' },
      { to: '/graph', label: 'Graph Workspace', icon: 'Workflow' },
      { to: '/evidence', label: 'Evidence Board', icon: 'Images' },
      { to: '/map', label: 'Map', icon: 'Map' },
      { to: '/timeline', label: 'Case Timeline', icon: 'History' },
      { to: '/notes', label: 'Notes', icon: 'NotebookPen' }
    ]
  },
  {
    heading: 'Identities',
    items: [
      { to: '/sock-puppets', label: 'Sock Puppets', icon: 'Drama' },
      { to: '/browser', label: 'Browser', icon: 'Globe' },
      { to: '/mailbox', label: 'Mailbox', icon: 'Mail' },
      { to: '/vpn', label: 'VPN', icon: 'Shield' }
    ]
  },
  {
    heading: 'Research',
    items: [
      { to: '/enumerate', label: 'Account Finder', icon: 'ScanSearch' },
      { to: '/intel', label: 'Email & Phone', icon: 'UserSearch' },
      { to: '/infra', label: 'Domain & IP', icon: 'Server' },
      { to: '/recon', label: 'Domain Recon', icon: 'Radar' },
      { to: '/cross-ref', label: 'Cross-Reference', icon: 'Layers' },
      { to: '/co-locate', label: 'Proximity', icon: 'Crosshair' },
      { to: '/fb-id', label: 'Profile ID', icon: 'Fingerprint' },
      { to: '/wireless', label: 'Wireless (WiGLE)', icon: 'Wifi' },
      { to: '/reddit', label: 'Reddit archive', icon: 'MessageSquare' },
      { to: '/xpost', label: 'X post lookup', icon: 'Twitter' },
      { to: '/dork', label: 'Dork & Pivot', icon: 'Binoculars' },
      { to: '/tools', label: 'Tools & Resources', icon: 'Wrench' }
    ]
  },
  {
    heading: 'Training',
    toggle: 'courseNotes',
    items: [
      { to: '/exam-prep', label: 'PORP Exam Prep', icon: 'GraduationCap' },
      { to: '/notes?folder=Course', label: 'Course Notes', icon: 'BookOpen' }
    ]
  },
  {
    heading: 'App',
    items: [
      { to: '/whats-new', label: "What's New", icon: 'Sparkles' },
      { to: '/settings', label: 'Settings', icon: 'Settings' }
    ]
  }
]

export function Sidebar(): JSX.Element {
  const { settings } = useSettings()
  const { tutorialActive } = useTutorial()
  const [version, setVersion] = useState('')
  useEffect(() => {
    api.app.version().then(setVersion)
  }, [])
  const groups = GROUPS.filter((g) => g.toggle !== 'courseNotes' || settings.showTraining !== false)
  const ghost = settings.ghostMode === true

  // macOS-dock-style proximity magnification (GhostWire mode only): as the cursor
  // moves down the nav, each item lifts/scales based on its distance from the
  // pointer, so neighbours ride along instead of only the hovered row. Driven by
  // direct DOM writes inside rAF (no per-frame React re-render); a short CSS
  // transition smooths the motion and the glide back on mouse-out.
  const navRef = useRef<HTMLElement>(null)
  const rafRef = useRef<number>()
  const RADIUS = 84 // px of influence above/below the cursor
  const MAX_SHIFT = 13 // px the closest item slides out
  const MAX_SCALE = 0.14 // extra scale on the closest item

  const applyDock = (y: number): void => {
    const items = navRef.current?.querySelectorAll<HTMLElement>('[data-dock]')
    if (!items) return
    items.forEach((el) => {
      const r = el.getBoundingClientRect()
      const dist = Math.abs(r.top + r.height / 2 - y)
      const f = Math.max(0, 1 - dist / RADIUS)
      const ease = f * f * (3 - 2 * f) // smoothstep falloff
      el.style.transform = `translateX(${ease * MAX_SHIFT}px) scale(${1 + ease * MAX_SCALE})`
    })
  }

  const onNavMove = (e: React.MouseEvent): void => {
    if (!ghost) return
    const y = e.clientY
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => applyDock(y))
  }

  const onNavLeave = (): void => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    navRef.current?.querySelectorAll<HTMLElement>('[data-dock]').forEach((el) => {
      el.style.transform = ''
    })
  }

  return (
    <aside
      className={`w-60 shrink-0 flex flex-col ${
        ghost ? 'bg-gradient-to-r from-ink-950/85 via-ink-950/60 to-transparent' : 'bg-ink-900 border-r border-ink-700'
      }`}
    >
      {/* Brand — in GhostWire mode keep just the icon (text dropped, the center
          emblem carries the name). */}
      <div className={`flex items-center gap-3 px-4 h-16 ${ghost ? '' : 'border-b border-ink-700'}`}>
        <img src={iconUrl} alt="GhostWire" className="w-9 h-9 rounded-xl object-cover shadow-glow" />
        {!ghost && (
          <div className="leading-tight">
            <div className="font-bold text-slate-100 tracking-tight">GhostWire</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">OSINT Workbench</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        ref={navRef}
        onMouseMove={onNavMove}
        onMouseLeave={onNavLeave}
        className="flex-1 overflow-y-auto py-3 px-2 space-y-4"
      >
        {groups.map((g, i) => (
          <div key={i}>
            {g.heading && !ghost && (
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                {g.heading}
              </div>
            )}
            <div className={ghost ? 'space-y-1' : 'space-y-0.5'}>
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  data-dock={ghost ? '' : undefined}
                  style={
                    ghost
                      ? {
                          transformOrigin: 'left center',
                          transition: 'transform 0.18s ease-out, color 0.15s ease-out',
                          willChange: 'transform'
                        }
                      : undefined
                  }
                  className={({ isActive }) =>
                    ghost
                      ? `flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-[0.14em] transition-colors ${
                          isActive
                            ? `text-accent-glow font-semibold gw-nav-active${tutorialActive ? ' ring-1 ring-accent-glow/50 rounded-lg' : ''}`
                            : 'text-slate-400 hover:text-accent-glow'
                        }`
                      : `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? `bg-brand/15 text-brand-glow font-medium${tutorialActive ? ' ring-1 ring-brand-glow/60 shadow-[0_0_12px_rgba(var(--brand),0.25)]' : ''}`
                            : 'text-slate-400 hover:text-slate-200 hover:bg-ink-800'
                        }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon name={item.icon} size={ghost ? 17 : 18} className={ghost ? 'shrink-0' : ''} />
                      {item.label}
                      {tutorialActive && isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-glow animate-pulse shrink-0" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer status */}
      <div className={`p-3 ${ghost ? '' : 'border-t border-ink-700'}`}>
        <div className={`flex items-center gap-2 px-2 py-2 rounded-lg ${ghost ? '' : 'bg-ink-800 border border-ink-700'}`}>
          <Icon name="HardDriveDownload" size={16} className="text-ok" />
          <div className="text-xs">
            <div className="text-slate-300 font-medium">Local data</div>
            <div className="text-slate-500">Stored on this device</div>
          </div>
        </div>
        <div className="text-[10px] text-slate-600 text-center mt-2">GhostWire{version ? ` v${version}` : ''}</div>
      </div>
    </aside>
  )
}
