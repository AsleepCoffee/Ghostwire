import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, ExternalLink, Trash2, Pencil, Target } from 'lucide-react'
import { api, type ToolLink } from '../lib/api'
import { Icon, Modal, EmptyState } from '../components/ui'

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

export function Tools(): JSX.Element {
  const [params] = useSearchParams()
  const [tools, setTools] = useState<ToolLink[]>([])
  const [cat, setCat] = useState<string>(params.get('category') ?? 'All')
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  const [editing, setEditing] = useState<Partial<ToolLink> | null>(null)
  const nav = useNavigate()

  const load = async (): Promise<void> => setTools(await api.tools.list())
  useEffect(() => {
    load()
  }, [])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(tools.map((t) => t.category)))],
    [tools]
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return tools.filter(
      (t) =>
        (cat === 'All' || t.category === cat) &&
        (!q || t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q))
    )
  }, [tools, cat, query])

  const launch = (t: ToolLink): void => {
    const url = t.url.includes('{QUERY}')
      ? t.url.replace('{QUERY}', encodeURIComponent(term.trim()))
      : t.url
    nav(`/browser?url=${encodeURIComponent(url)}`)
  }

  const remove = async (t: ToolLink): Promise<void> => {
    if (!confirm(`Remove "${t.name}" from your tools?`)) return
    await api.tools.remove(t.id)
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
            Launch OSINT tools in the embedded browser. Tools with a query slot use the search term below.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ category: 'General' })}>
          <Plus size={16} /> Add Tool
        </button>
      </div>

      {/* Query + search */}
      <div className="px-6 py-3 border-b border-ink-700 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Target size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
          <input
            className="input pl-9"
            placeholder="Search term to inject into tools (email, username, domain…)"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <div className="relative w-64">
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

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <EmptyState icon="Wrench" title="No tools found" subtitle="Try a different filter or add a custom tool." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="card p-3.5 hover:border-brand/40 hover:shadow-glow transition-all cursor-pointer group relative"
                onClick={() => launch(t)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-ink-800 border border-ink-700 flex items-center justify-center shrink-0">
                    <Icon name={CATEGORY_ICON[t.category] ?? 'Wrench'} size={18} className="text-brand-glow" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-100 truncate flex items-center gap-1">
                      {t.name}
                      {t.url.includes('{QUERY}') && (
                        <span className="text-[9px] text-accent border border-accent/30 rounded px-1">Q</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{t.category}</div>
                  </div>
                </div>
                {t.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{t.description}</p>
                )}
                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
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
            ))}
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
    </div>
  )
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
            <label className="label">Description</label>
            <input className="input" value={t.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
          </div>
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
