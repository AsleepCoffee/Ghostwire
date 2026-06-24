import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus,
  Search,
  ExternalLink,
  Trash2,
  Pencil,
  Target,
  Crosshair,
  Activity,
  Loader2,
  Lock,
  Sparkles
} from 'lucide-react'
import { api, type ToolLink, type ToolHealth } from '../lib/api'
import { Icon, Modal, EmptyState } from '../components/ui'
import { PivotModal } from '../components/PivotModal'
import { useOpenInBrowser } from '../lib/browserBus'
import { useConfirm } from '../lib/confirm'
import { useSettings } from '../lib/settings'
import { INTEGRATION_SERVICES, type ApiService } from '../lib/apiServices'
import type { PivotSubject } from '../lib/pivot'

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

const HEALTH: Record<ToolHealth, { color: string; label: string }> = {
  ok: { color: '#34d399', label: 'Loads OK' },
  login: { color: '#f59e0b', label: 'Login required' },
  blocked: { color: '#f43f5e', label: 'Blocked / failed' },
  error: { color: '#f43f5e', label: 'Error / timeout' }
}

function renderIntegration(s: ApiService, unlocked: boolean, onLaunch: (s: ApiService) => void): JSX.Element {
  return (
    <div
      key={s.id}
      onClick={() => onLaunch(s)}
      className={`card p-3.5 relative transition-all cursor-pointer ${
        unlocked ? 'hover:border-accent/40 hover:shadow-glow' : 'opacity-60 hover:opacity-100'
      }`}
      title={unlocked ? `Launch ${s.name}` : `Locked — add your ${s.name} API key in Settings`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-ink-800 border border-ink-700 flex items-center justify-center shrink-0">
          {unlocked ? (
            <Icon name={CATEGORY_ICON[s.tool!.category] ?? 'Wrench'} size={18} className="text-accent" />
          ) : (
            <Lock size={16} className="text-slate-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-100 truncate">{s.name}</div>
          <div className="text-xs text-slate-500 truncate">{unlocked ? s.unlocks : 'Locked — needs API key'}</div>
        </div>
      </div>
    </div>
  )
}

export function Tools(): JSX.Element {
  const [params] = useSearchParams()
  const [tools, setTools] = useState<ToolLink[]>([])
  const [cat, setCat] = useState<string>(params.get('category') ?? 'All')
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  const [editing, setEditing] = useState<Partial<ToolLink> | null>(null)
  const [pivotOpen, setPivotOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const openInBrowser = useOpenInBrowser()
  const confirm = useConfirm()
  const nav = useNavigate()
  const { settings } = useSettings()
  const apiKeys = settings.apiKeys ?? {}
  const unsubRef = useRef<(() => void) | null>(null)

  const launchIntegration = (s: (typeof INTEGRATION_SERVICES)[number]): void => {
    if (!apiKeys[s.id]) {
      nav('/settings')
      return
    }
    if (!s.tool) return
    const url = s.tool.query ? s.tool.url.replace('{QUERY}', encodeURIComponent(term.trim())) : s.tool.url
    openInBrowser([url])
  }

  const load = async (): Promise<void> => setTools(await api.tools.list())
  useEffect(() => {
    load()
    return () => unsubRef.current?.()
  }, [])

  const categories = useMemo(() => ['All', ...Array.from(new Set(tools.map((t) => t.category)))], [tools])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return tools.filter(
      (t) =>
        (cat === 'All' || t.category === cat) &&
        (!q || t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q))
    )
  }, [tools, cat, query])

  const resolveUrl = (t: ToolLink): string =>
    t.url.includes('{QUERY}') ? t.url.replace('{QUERY}', encodeURIComponent(term.trim())) : t.url

  const launch = (t: ToolLink): void => {
    const url = resolveUrl(t)
    if (t.openMode === 'external') api.shell.openExternal(url)
    else openInBrowser([url])
  }

  const launchAllVisible = (): void => {
    const embed = filtered.filter((t) => t.openMode !== 'external')
    const external = filtered.filter((t) => t.openMode === 'external')
    external.forEach((t) => api.shell.openExternal(resolveUrl(t)))
    if (embed.length) openInBrowser(embed.map(resolveUrl))
  }

  const remove = async (t: ToolLink): Promise<void> => {
    if (!(await confirm({ title: `Remove “${t.name}”?`, message: 'It will be removed from your tools.', confirmText: 'Remove', danger: true }))) return
    await api.tools.remove(t.id)
    load()
  }

  const testAll = async (): Promise<void> => {
    setTesting(true)
    setProgress({ done: 0, total: tools.length })
    unsubRef.current = api.tools.onTestProgress((r) => {
      setProgress({ done: r.done, total: r.total })
      setTools((prev) => prev.map((t) => (t.id === r.id ? { ...t, health: r.health } : t)))
    })
    await api.tools.testAll()
    unsubRef.current?.()
    unsubRef.current = null
    setTesting(false)
    load()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="Wrench" size={20} className="text-brand-glow" /> Tools & Resources
          </h1>
          <p className="text-sm text-slate-500">
            Launch tools in the in-app browser (or externally). Run a health-check to see what works.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost border border-ink-600" onClick={testAll} disabled={testing}>
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
            {testing ? `Testing ${progress.done}/${progress.total}` : 'Test all'}
          </button>
          <button className="btn-primary" onClick={() => setEditing({ category: 'General', openMode: 'embed' })}>
            <Plus size={16} /> Add Tool
          </button>
        </div>
      </div>

      {/* Query + search */}
      <div className="px-6 py-3 border-b border-ink-700 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Target size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
          <input
            className="input pl-9"
            placeholder="Search term to inject into {QUERY} tools (email, username, domain…)"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <button className="btn-ghost border border-ink-600" disabled={!term.trim()} onClick={() => setPivotOpen(true)}>
          <Crosshair size={15} /> Pivot
        </button>
        <button
          className="btn-ghost border border-ink-600"
          disabled={filtered.length === 0}
          onClick={launchAllVisible}
          title="Open all tools shown below"
        >
          <ExternalLink size={15} /> Run all shown
        </button>
        <div className="relative w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Filter tools…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-6 py-2.5 border-b border-ink-700 flex items-center gap-1.5 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              cat === c ? 'bg-brand/15 text-brand-glow font-medium' : 'text-slate-400 hover:bg-ink-800'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* API integrations — locked until the matching key is added in Settings */}
        {(cat === 'All' || !query) && (
          <section>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-accent" />
              <h2 className="font-semibold text-slate-100 text-sm">API Integrations</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Unlocked by adding the matching API key in Settings. Locked tools open Settings so you can paste a key.
            </p>

            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Free tier</div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {INTEGRATION_SERVICES.filter((s) => s.tier === 'free').map((s) => renderIntegration(s, !!apiKeys[s.id], launchIntegration))}
            </div>

            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-4 mb-2 flex items-center gap-2">
              Subscription required
              <span className="px-1.5 py-0.5 rounded bg-warn/15 text-warn text-[9px] normal-case tracking-normal">paid plans</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {INTEGRATION_SERVICES.filter((s) => s.tier === 'paid').map((s) => renderIntegration(s, !!apiKeys[s.id], launchIntegration))}
            </div>
          </section>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon="Wrench" title="No tools found" subtitle="Try a different filter or add a custom tool." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((t) => {
              const h = t.health ? HEALTH[t.health] : null
              return (
                <div
                  key={t.id}
                  className="card p-3.5 hover:border-brand/40 hover:shadow-glow transition-all cursor-pointer group relative"
                  onClick={() => launch(t)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-ink-800 border border-ink-700 flex items-center justify-center shrink-0 relative">
                      <Icon name={CATEGORY_ICON[t.category] ?? 'Wrench'} size={18} className="text-brand-glow" />
                      {h && (
                        <span
                          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-ink-850"
                          style={{ background: h.color }}
                          title={h.label}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-100 truncate flex items-center gap-1">
                        {t.name}
                        {t.url.includes('{QUERY}') && (
                          <span className="text-[9px] text-accent border border-accent/30 rounded px-1">Q</span>
                        )}
                        {t.openMode === 'external' && (
                          <ExternalLink size={11} className="text-slate-500" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{t.category}</div>
                    </div>
                  </div>
                  {t.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{t.description}</p>}
                  <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                    <button
                      className="btn-ghost !p-1"
                      title="Open externally"
                      onClick={(e) => {
                        e.stopPropagation()
                        api.shell.openExternal(resolveUrl(t))
                      }}
                    >
                      <ExternalLink size={13} />
                    </button>
                    <button
                      className="btn-ghost !p-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditing(t)
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="btn-danger !p-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        remove(t)
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editing && (
        <ToolEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}

      <PivotModal open={pivotOpen} onClose={() => setPivotOpen(false)} subject={guessSubject(term)} value={term} />
    </div>
  )
}

/** Best-effort guess of what the term is, to preselect the pivot subject. */
function guessSubject(v: string): PivotSubject {
  const s = v.trim()
  if (/@/.test(s) && /\w+@\w+\.\w+/.test(s)) return 'email'
  if (/^\+?[\d\s().-]{7,}$/.test(s)) return 'phone'
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return 'ip'
  if (/^[\w-]+(\.[\w-]+)+$/.test(s)) return 'domain'
  if (/^@?\w+$/.test(s)) return 'username'
  if (/\s/.test(s)) return 'name'
  return 'generic'
}

function ToolEditor({
  initial,
  onClose,
  onSaved
}: {
  initial: Partial<ToolLink>
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const [t, setT] = useState<Partial<ToolLink>>({ ...initial })
  const set = (p: Partial<ToolLink>): void => setT((prev) => ({ ...prev, ...p }))
  const save = async (): Promise<void> => {
    await api.tools.save(t)
    onSaved()
  }
  return (
    <Modal open onClose={onClose} title={initial.id ? 'Edit tool' : 'Add tool'}>
      <div className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={t.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div>
          <label className="label">URL</label>
          <input
            className="input font-mono text-xs"
            placeholder="https://example.com/search?q={QUERY}"
            value={t.url ?? ''}
            onChange={(e) => set({ url: e.target.value })}
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Use <code className="text-accent">{'{QUERY}'}</code> where the search term should be inserted.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <input className="input" value={t.category ?? ''} onChange={(e) => set({ category: e.target.value })} />
          </div>
          <div>
            <label className="label">Opens in</label>
            <select
              className="input"
              value={t.openMode ?? 'embed'}
              onChange={(e) => set({ openMode: e.target.value as 'embed' | 'external' })}
            >
              <option value="embed">In-app browser</option>
              <option value="external">System browser</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={t.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" onClick={save}>
          <ExternalLink size={15} /> Save tool
        </button>
      </div>
    </Modal>
  )
}
