import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from './ui'
import { useSettings } from '../lib/settings'
import { api } from '../lib/api'
import iconUrl from '../assets/icon.png'

interface NavItem {
  to: string
  label: string
  icon: string
}

const GROUPS: { heading?: string; items: NavItem[]; toggle?: 'courseNotes' }[] = [
  {
    items: [{ to: '/', label: 'Dashboard', icon: 'LayoutDashboard' }]
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
  const [version, setVersion] = useState('')
  useEffect(() => {
    api.app.version().then(setVersion)
  }, [])
  const groups = GROUPS.filter((g) => g.toggle !== 'courseNotes' || settings.showTraining !== false)
  return (
    <aside className="w-60 shrink-0 bg-ink-900 border-r border-ink-700 flex flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-ink-700">
        <img src={iconUrl} alt="GhostWire" className="w-9 h-9 rounded-xl object-cover shadow-glow" />
        <div className="leading-tight">
          <div className="font-bold text-slate-100 tracking-tight">GhostWire</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest">OSINT Workbench</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {groups.map((g, i) => (
          <div key={i}>
            {g.heading && (
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                {g.heading}
              </div>
            )}
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-brand/15 text-brand-glow font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-ink-800'
                    }`
                  }
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer status */}
      <div className="p-3 border-t border-ink-700">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-ink-800 border border-ink-700">
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
