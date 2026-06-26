import { useEffect, useMemo, useState } from 'react'
import { Layers, Loader2, Download, Trash2, ExternalLink, Plus, Crosshair, Star } from 'lucide-react'
import { api, type Evidence } from '../lib/api'
import { useSettings } from '../lib/settings'
import { useOpenTabs, setPasteImage, readActiveTab } from '../lib/browserBus'
import { EmptyState } from '../components/ui'

/** Reverse-image engines that render their results in-page (so we can scrape the
 *  links off the page you have open). Yandex is the most reliable. */
const ENGINES = [
  { label: 'Yandex', url: 'https://yandex.com/images/' },
  { label: 'Google Lens', url: 'https://lens.google.com/' },
  { label: 'Bing', url: 'https://www.bing.com/visualsearch' },
  { label: 'TinEye', url: 'https://tineye.com/' }
]

// Hosts that are search engines / CDNs / boilerplate — never the shared source.
const JUNK = [
  /(^|\.)google\./, /(^|\.)gstatic\./, /(^|\.)googleusercontent\./, /(^|\.)yandex\./,
  /(^|\.)yastatic\./, /(^|\.)bing\./, /(^|\.)bingapis\./, /(^|\.)microsoft/, /(^|\.)msn\./,
  /(^|\.)tineye\./, /(^|\.)pinimg\./, /(^|\.)fbcdn\./, /(^|\.)w3\.org/, /(^|\.)schema\.org/,
  /(^|\.)gmpg\.org/, /(^|\.)youtube\./, /(^|\.)ytimg\./, /(^|\.)wikipedia\./, /(^|\.)wikimedia\./
]

interface Candidate {
  /** Normalised page/board key (host + a path segment or two). */
  key: string
  host: string
  /** Representative full URL for opening. */
  url: string
}

/** Turn a raw result link into a normalised "page" key so the same board/profile
 *  collapses to one candidate (Pinterest board/pin, Instagram profile, else host
 *  + first path segment). */
function candidate(raw: string): Candidate | null {
  try {
    const u = new URL(raw)
    if (!/^https?:$/.test(u.protocol)) return null
    const host = u.hostname.replace(/^www\./, '')
    if (JUNK.some((r) => r.test(host))) return null
    const segs = u.pathname.split('/').filter(Boolean)
    let key = host
    if (/(^|\.)pinterest\./.test(host)) key = host + '/' + segs.slice(0, 2).join('/')
    else if (/(^|\.)instagram\.com$/.test(host)) key = host + '/' + (segs[0] ?? '')
    else if (/(^|\.)(facebook|twitter|x|tiktok|flickr|vk)\./.test(host)) key = host + '/' + (segs[0] ?? '')
    else if (segs.length) key = host + '/' + segs[0]
    return { key, host, url: raw }
  } catch {
    return null
  }
}

export function CrossRef(): JSX.Element {
  const { settings } = useSettings()
  const openTabs = useOpenTabs()
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [selected, setSelected] = useState<string[]>([])
  // evidenceId -> collected candidate links
  const [links, setLinks] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState<string>('')
  const [note, setNote] = useState('')

  useEffect(() => {
    api.evidence.list(settings.activeProjectId ?? null).then((list) => setEvidence(list.filter((e) => e.kind !== 'file')))
  }, [settings.activeProjectId])

  const toggle = (id: string): void =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  // Copy the image + open the engine so the user can paste (Ctrl+V) and get results.
  const search = async (ev: Evidence, engineUrl: string): Promise<void> => {
    const dataUrl = await api.files.dataUrl(ev.path)
    if (dataUrl) {
      await api.clipboard.writeImage(dataUrl)
      setPasteImage({ dataUrl, label: ev.title || 'Cross-ref image' })
    }
    openTabs([{ url: engineUrl }])
  }

  // Pull the links off whatever results page is currently open and attribute them
  // to this image.
  const grab = async (id: string): Promise<void> => {
    setBusy(id)
    setNote('')
    try {
      const snap = await readActiveTab()
      if (!snap) {
        setNote('No open browser tab to read. Run a reverse search first, then come back and grab.')
        return
      }
      const fresh = snap.links.filter((h) => candidate(h))
      setLinks((m) => {
        const prev = new Set(m[id] ?? [])
        fresh.forEach((h) => prev.add(h))
        return { ...m, [id]: [...prev] }
      })
      setNote(`Grabbed ${fresh.length} candidate links from “${snap.title || snap.url}”.`)
    } finally {
      setBusy('')
    }
  }

  const addManual = (id: string, text: string): void => {
    const urls = text.split(/\s+/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s))
    if (!urls.length) return
    setLinks((m) => {
      const prev = new Set(m[id] ?? [])
      urls.forEach((u) => prev.add(u))
      return { ...m, [id]: [...prev] }
    })
  }

  const clearImage = (id: string): void => setLinks((m) => ({ ...m, [id]: [] }))

  // Tally every candidate page by how many of the selected images it appears in.
  const common = useMemo(() => {
    const tally = new Map<string, { cand: Candidate; imgs: Set<string>; urls: Set<string> }>()
    for (const id of selected) {
      const seen = new Set<string>()
      for (const raw of links[id] ?? []) {
        const c = candidate(raw)
        if (!c || seen.has(c.key)) continue
        seen.add(c.key)
        const entry = tally.get(c.key) ?? { cand: c, imgs: new Set(), urls: new Set() }
        entry.imgs.add(id)
        entry.urls.add(raw)
        tally.set(c.key, entry)
      }
    }
    return [...tally.values()]
      .filter((e) => e.imgs.size >= 2)
      .sort((a, b) => b.imgs.size - a.imgs.size)
  }, [links, selected])

  const selectedEv = evidence.filter((e) => selected.includes(e.id))

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-ink-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Layers size={20} className="text-brand-glow" /> Cross-Reference Images
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Find the page that hosts several images at once. Reverse-search each image, grab the result links from the
          open tab, and any board/profile/site appearing across multiple images rises to the top.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Step 1 — pick images */}
        <div>
          <div className="label">1 · Pick the images to cross-reference</div>
          {evidence.length === 0 ? (
            <EmptyState
              icon="Layers"
              title="No images in this investigation yet"
              subtitle="Add images to the Evidence Board first, then cross-reference them here."
            />
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {evidence.map((e) => {
                const on = selected.includes(e.id)
                return (
                  <button
                    key={e.id}
                    onClick={() => toggle(e.id)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                      on ? 'border-accent' : 'border-ink-700 hover:border-ink-500'
                    }`}
                    title={e.title || 'evidence'}
                  >
                    <img src={e.path} alt="" className="w-full h-full object-cover" />
                    {on && <div className="absolute inset-0 bg-accent/20" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Step 2 — per-image reverse search + grab */}
        {selectedEv.length > 0 && (
          <div>
            <div className="label">2 · Reverse-search each image, then grab the result links</div>
            <div className="space-y-3 mt-1">
              {selectedEv.map((e, i) => (
                <div key={e.id} className="card p-3 flex gap-3">
                  <img src={e.path} alt="" className="w-16 h-16 object-cover rounded-md border border-ink-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 font-medium truncate">
                      Image {i + 1} — {e.title || e.sourceUrl || 'untitled'}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {ENGINES.map((eng) => (
                        <button key={eng.label} className="btn-ghost border border-ink-600 text-[11px]" onClick={() => search(e, eng.url)}>
                          {eng.label}
                        </button>
                      ))}
                      <button
                        className="btn-ghost border border-accent/40 text-accent-glow text-[11px]"
                        onClick={() => grab(e.id)}
                        disabled={busy === e.id}
                        title="Read the links off the results page you have open"
                      >
                        {busy === e.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Grab open-tab links
                      </button>
                      {(links[e.id]?.length ?? 0) > 0 && (
                        <span className="text-[11px] text-slate-500 self-center">
                          {links[e.id].length} links
                          <button className="ml-2 text-slate-600 hover:text-warn" onClick={() => clearImage(e.id)} title="Clear">
                            <Trash2 size={11} className="inline" />
                          </button>
                        </span>
                      )}
                    </div>
                    <input
                      className="input !py-1 text-[11px] mt-1.5"
                      placeholder="…or paste candidate URLs here and press Enter"
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') {
                          addManual(e.id, (ev.target as HTMLInputElement).value)
                          ;(ev.target as HTMLInputElement).value = ''
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {note && <p className="text-[11px] text-slate-500 mt-2">{note}</p>}
          </div>
        )}

        {/* Step 3 — common sources */}
        {selectedEv.length >= 2 && (
          <div>
            <div className="label flex items-center gap-1.5">
              <Crosshair size={13} className="text-accent" /> 3 · Shared sources
            </div>
            {common.length === 0 ? (
              <p className="text-sm text-slate-500 mt-1">
                Nothing in common yet. Grab links from at least two images — pages that appear for more than one image show
                up here.
              </p>
            ) : (
              <div className="space-y-1.5 mt-1">
                {common.map((c) => {
                  const all = c.imgs.size === selectedEv.length
                  return (
                    <div
                      key={c.cand.key}
                      className={`card p-2.5 flex items-center gap-2 ${all ? 'border-ok/50' : ''}`}
                    >
                      {all && <Star size={14} className="text-ok shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-200 truncate">{c.cand.key}</div>
                        <div className="text-[11px] text-slate-500">
                          Appears for {c.imgs.size} of {selectedEv.length} images
                          {all ? ' — in ALL of them' : ''}
                        </div>
                      </div>
                      <button
                        className="btn-ghost border border-ink-600 text-[11px]"
                        onClick={() => openTabs([...c.urls].slice(0, 6).map((u) => ({ url: u })))}
                        title="Open the matching pages"
                      >
                        <ExternalLink size={12} /> Open ({Math.min(c.urls.size, 6)})
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {selectedEv.length === 1 && (
          <p className="text-sm text-slate-500 flex items-center gap-1.5">
            <Plus size={14} /> Select at least one more image to find shared sources.
          </p>
        )}
      </div>
    </div>
  )
}
