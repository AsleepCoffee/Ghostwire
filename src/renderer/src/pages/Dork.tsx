import { useState } from 'react'
import { Search, Copy, Wand2, Crosshair, Check } from 'lucide-react'
import { Icon } from '../components/ui'
import { PivotModal } from '../components/PivotModal'
import {
  EMPTY_DORK,
  buildDorkQuery,
  dorkUrl,
  DORK_TEMPLATES,
  SEARCH_ENGINES,
  SUBJECT_LABELS,
  type DorkParams,
  type PivotSubject
} from '../lib/pivot'
import { api } from '../lib/api'
import { useOpenInBrowser } from '../lib/browserBus'

export function Dork(): JSX.Element {
  const [p, setP] = useState<DorkParams>({ ...EMPTY_DORK })
  const [copied, setCopied] = useState(false)
  const [pivotOpen, setPivotOpen] = useState(false)
  const [pivotValue, setPivotValue] = useState('')
  const [pivotSubject, setPivotSubject] = useState<PivotSubject>('generic')
  const [tmplTarget, setTmplTarget] = useState('')
  const openInBrowser = useOpenInBrowser()

  const set = (patch: Partial<DorkParams>): void => setP((prev) => ({ ...prev, ...patch }))
  const query = buildDorkQuery(p)

  const copy = (): void => {
    api.clipboard.writeText(query)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const fields: { key: keyof DorkParams; label: string; placeholder: string }[] = [
    { key: 'terms', label: 'Keywords', placeholder: 'free text terms' },
    { key: 'exact', label: 'Exact phrase', placeholder: 'wrapped in quotes' },
    { key: 'site', label: 'site:', placeholder: 'example.com' },
    { key: 'intitle', label: 'intitle:', placeholder: 'admin' },
    { key: 'inurl', label: 'inurl:', placeholder: 'login' },
    { key: 'filetype', label: 'filetype:', placeholder: 'pdf' },
    { key: 'orTerms', label: 'Any of (OR, comma-sep)', placeholder: 'password, secret, key' },
    { key: 'exclude', label: 'Exclude (comma-sep)', placeholder: 'careers, jobs' }
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="Binoculars" size={20} className="text-brand-glow" /> Dork & Pivot
          </h1>
          <p className="text-sm text-slate-500">
            Build a dork, run it across Google, Bing, DuckDuckGo, Yandex, Brave, Baidu and more, fire ready-made templates, or pivot any value across every relevant tool at once.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Dork builder */}
          <section className="card p-5">
            <h2 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Wand2 size={16} className="text-brand-glow" /> Google Dork Builder
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key} className={f.key === 'terms' || f.key === 'exact' ? 'col-span-2' : ''}>
                  <label className="label">{f.label}</label>
                  <input
                    className="input"
                    placeholder={f.placeholder}
                    value={p[f.key]}
                    onChange={(e) => set({ [f.key]: e.target.value } as Partial<DorkParams>)}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="label">Query preview</label>
              <div className="input font-mono text-xs min-h-[42px] flex items-center break-all">
                {query || <span className="text-slate-600">build a query above…</span>}
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button className="btn-primary flex-1 justify-center" disabled={!query} onClick={() => openInBrowser([dorkUrl(query)])}>
                <Search size={15} /> Run in tab
              </button>
              <button className="btn-ghost border border-ink-600" disabled={!query} onClick={copy} title="Copy query">
                {copied ? <Check size={15} className="text-ok" /> : <Copy size={15} />}
              </button>
            </div>

            {query && (
              <div className="mt-3">
                <label className="label">Run on search engines</label>
                <div className="flex flex-wrap gap-1.5">
                  {SEARCH_ENGINES.map((e) => (
                    <button
                      key={e.label}
                      className="btn-ghost border border-ink-600 text-xs"
                      onClick={() => openInBrowser([e.url(query)])}
                      title={`Open on ${e.label}`}
                    >
                      {e.label}
                    </button>
                  ))}
                  <button
                    className="btn-ghost border border-ink-600 text-xs text-accent"
                    onClick={() => openInBrowser(SEARCH_ENGINES.map((e) => e.url(query)))}
                    title="Open the query on every engine"
                  >
                    All engines
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5">
                  Operators like <code>site:</code> and <code>filetype:</code> work on most engines; advanced Google-only
                  operators may be ignored elsewhere.
                </p>
              </div>
            )}
          </section>

          <div className="space-y-5">
            {/* Pivot */}
            <section className="card p-5">
              <h2 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <Crosshair size={16} className="text-brand-glow" /> Pivot a value
              </h2>
              <p className="text-sm text-slate-500 mb-3">
                Enter something you found and open every relevant lookup at once.
              </p>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="email, username, domain, name…"
                  value={pivotValue}
                  onChange={(e) => setPivotValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && pivotValue.trim() && setPivotOpen(true)}
                />
                <select
                  className="input !w-auto"
                  value={pivotSubject}
                  onChange={(e) => setPivotSubject(e.target.value as PivotSubject)}
                >
                  {Object.entries(SUBJECT_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <button className="btn-primary" disabled={!pivotValue.trim()} onClick={() => setPivotOpen(true)}>
                  Pivot
                </button>
              </div>
            </section>

            {/* Templates */}
            <section className="card p-5">
              <h2 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <Icon name="Zap" size={16} className="text-brand-glow" /> Quick dork templates
              </h2>
              <input
                className="input mb-3"
                placeholder="Target domain or term for templates…"
                value={tmplTarget}
                onChange={(e) => setTmplTarget(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-1.5">
                {DORK_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    disabled={!tmplTarget.trim()}
                    onClick={() => openInBrowser([dorkUrl(t.build(tmplTarget.trim()))])}
                    className="text-left px-2.5 py-1.5 rounded-lg border border-ink-700 text-sm text-slate-300 hover:bg-ink-800 hover:border-brand/30 disabled:opacity-40"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <PivotModal open={pivotOpen} onClose={() => setPivotOpen(false)} subject={pivotSubject} value={pivotValue} />
    </div>
  )
}
