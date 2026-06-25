import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { api } from '../lib/api'
import { Icon } from '../components/ui'
import { CHANGELOG } from '../lib/changelog'
import { fmtDate } from '../lib/format'

export function WhatsNew(): JSX.Element {
  const [version, setVersion] = useState('')
  useEffect(() => {
    api.app.version().then(setVersion)
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="Sparkles" size={22} className="text-brand-glow" /> What’s new
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Recent changes to GhostWire{version ? ` — you’re on v${version}` : ''}.
          </p>
        </div>

        <div className="relative pl-5">
          {/* Timeline rail */}
          <span className="absolute left-1 top-1 bottom-1 w-px bg-ink-700" />
          <div className="space-y-6">
            {CHANGELOG.map((c) => (
              <div key={c.version} className="relative">
                <span className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-brand-glow ring-4 ring-ink-950" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">v{c.version}</span>
                  {version === c.version && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand/15 text-brand-glow">installed</span>
                  )}
                  <span className="text-xs text-slate-500">{fmtDate(c.date)}</span>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {c.notes.map((n, i) => (
                    <li key={i} className="text-sm text-slate-400 flex gap-2">
                      <span className="text-brand-glow mt-1.5 w-1 h-1 rounded-full bg-current shrink-0" />
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <button
          className="btn-ghost border border-ink-600"
          onClick={() => api.shell.openExternal('https://github.com/AsleepCoffee/Ghostwire/releases')}
        >
          <ExternalLink size={15} /> All releases on GitHub
        </button>
      </div>
    </div>
  )
}
