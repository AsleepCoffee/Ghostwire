import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Images,
  Upload,
  Link2,
  Trash2,
  X,
  Copy,
  Check,
  MapPin,
  ScanSearch,
  ScanText,
  Workflow,
  Download,
  FileText,
  Loader2,
  Search,
  NotebookPen,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Compass,
  Sparkles,
  MapPinned,
  Globe,
  Maximize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { api, type Evidence, type Project, type ExifResult, type EvidenceVerify, type GeoResult } from '../lib/api'
import { useSettings } from '../lib/settings'
import { useConfirm } from '../lib/confirm'
import { useOpenInBrowser, useOpenTabs, setPasteImage } from '../lib/browserBus'
import { fmtDateTime } from '../lib/format'
import { EmptyState } from '../components/ui'


/** Reverse-image-search engines. `upload` is the page whose file-input we drop
 *  the saved evidence image into (the in-app browser auto-uploads it). */
const REVERSE: { label: string; upload: string }[] = [
  { label: 'Google Lens', upload: 'https://lens.google.com/' },
  { label: 'Yandex', upload: 'https://yandex.com/images/' },
  { label: 'Bing', upload: 'https://www.bing.com/visualsearch' },
  { label: 'TinEye', upload: 'https://tineye.com/' },
  { label: 'PimEyes (faces)', upload: 'https://pimeyes.com/en' }
]

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = reject
    r.readAsDataURL(file)
  })

export function EvidencePage(): JSX.Element {
  const { settings, update } = useSettings()
  const nav = useNavigate()
  const confirm = useConfirm()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string | null>(settings.activeProjectId ?? null)
  const [items, setItems] = useState<Evidence[]>([])
  const [selected, setSelected] = useState<Evidence | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [query, setQuery] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const shown = items.filter((e) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return `${e.title ?? ''} ${e.sourceUrl ?? ''} ${e.note ?? ''} ${e.ocr ?? ''}`.toLowerCase().includes(q)
  })

  const flash = (m: string): void => {
    setToast(m)
    setTimeout(() => setToast(''), 2600)
  }

  const load = useCallback((): void => {
    api.evidence.list(projectId).then(setItems)
  }, [projectId])

  useEffect(() => {
    api.projects.list().then(setProjects)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const ingestDataUrl = async (dataUrl: string, title?: string): Promise<void> => {
    if (!dataUrl.startsWith('data:image/')) return
    setBusy(true)
    try {
      await api.evidence.capture({ dataUrl, kind: 'image', projectId, title })
      load()
      flash('Added to evidence')
    } finally {
      setBusy(false)
    }
  }

  const onFiles = async (files: FileList | File[]): Promise<void> => {
    for (const f of Array.from(files)) {
      if (f.type.startsWith('image/')) await ingestDataUrl(await fileToDataUrl(f), f.name)
    }
  }

  const onDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) {
      await onFiles(e.dataTransfer.files)
      return
    }
    // Image dragged from a web page → comes through as a URL.
    const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (uri && /^https?:\/\//i.test(uri)) await addFromUrl(uri)
  }

  const addFromUrl = async (url: string): Promise<void> => {
    setBusy(true)
    try {
      await api.evidence.fromUrl(url, projectId)
      setUrlInput('')
      load()
      flash('Image saved from URL')
    } catch (err) {
      flash(String((err as Error)?.message ?? err))
    } finally {
      setBusy(false)
    }
  }

  // Paste a screenshot/image straight in (Ctrl+V).
  useEffect(() => {
    const handler = async (e: ClipboardEvent): Promise<void> => {
      const list = e.clipboardData?.items
      if (!list) return
      for (const it of Array.from(list)) {
        if (it.type.startsWith('image/')) {
          const f = it.getAsFile()
          if (f) await ingestDataUrl(await fileToDataUrl(f), 'Pasted image')
        }
      }
    }
    window.addEventListener('paste', handler as never)
    return () => window.removeEventListener('paste', handler as never)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const remove = async (ev: Evidence): Promise<void> => {
    const ok = await confirm({
      title: 'Delete this evidence?',
      message: 'It will be removed from the locker. The stored file is left on disk.',
      confirmText: 'Delete',
      danger: true
    })
    if (!ok) return
    await api.evidence.remove(ev.id)
    if (selected?.id === ev.id) setSelected(null)
    load()
  }

  const addToGraph = async (ev: Evidence): Promise<void> => {
    const boards = await api.boards.list()
    let board = boards.find((b) => b.projectId === projectId) ?? boards.find((b) => !projectId && !b.projectId)
    if (!board) {
      const proj = projects.find((p) => p.id === projectId)
      board = await api.boards.save({ name: `${proj?.name ?? 'Evidence'} — link chart`, projectId })
    }
    await api.boards.saveNode({
      boardId: board.id,
      type: 'image',
      label: ev.title || 'Evidence',
      props: { image: ev.path, ...(ev.sourceUrl ? { source: ev.sourceUrl } : {}) },
      x: 0,
      y: 0
    })
    nav(`/graph?board=${board.id}`)
  }

  return (
    <div
      className="h-full flex flex-col relative"
      onDragOver={(e) => {
        e.preventDefault()
        if (!dragging) setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-ink-700">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Images size={20} className="text-brand-glow" /> Evidence Board
          </h1>
          <p className="text-sm text-slate-500">Drop, paste or capture images — hashed, timestamped, and ready for reverse search.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            className="input !w-auto"
            value={projectId ?? ''}
            onChange={(e) => {
              const v = e.target.value || null
              setProjectId(v)
              update({ activeProjectId: v })
            }}
            title="Which investigation this evidence belongs to"
          >
            <option value="">Unfiled</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="btn-ghost border border-ink-600" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Add images
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => e.target.files && onFiles(e.target.files)}
          />
        </div>
      </div>

      {/* URL intake */}
      <div className="px-6 py-2.5 border-b border-ink-700 flex items-center gap-2">
        <Link2 size={15} className="text-slate-500 shrink-0" />
        <input
          className="input"
          placeholder="Paste an image URL to add it…"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && urlInput.trim() && addFromUrl(urlInput.trim())}
        />
        <button className="btn-ghost border border-ink-600 shrink-0" disabled={!urlInput.trim() || busy} onClick={() => addFromUrl(urlInput.trim())}>
          Add
        </button>
      </div>

      {items.length > 0 && (
        <div className="px-6 py-2.5 border-b border-ink-700 flex items-center gap-2">
          <Search size={15} className="text-slate-500 shrink-0" />
          <input
            className="input"
            placeholder="Search title, source, notes & OCR text…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && <span className="text-xs text-slate-500 shrink-0">{shown.length}/{items.length}</span>}
        </div>
      )}

      {/* Gallery */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <EmptyState
              icon="Images"
              title="No evidence yet"
              subtitle="Drag images here, paste a screenshot (Ctrl+V), paste an image URL, or use the in-app Browser's capture button."
            />
          ) : shown.length === 0 ? (
            <div className="text-center text-slate-500 mt-16">No evidence matches “{query}”.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {shown.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => setSelected(ev)}
                  className={`group card-interactive overflow-hidden text-left ${selected?.id === ev.id ? '!border-brand' : ''}`}
                >
                  <div className="aspect-square bg-ink-950 flex items-center justify-center overflow-hidden">
                    {ev.kind === 'file' ? (
                      <FileText size={28} className="text-slate-600" />
                    ) : (
                      <img src={ev.path} alt={ev.title || 'evidence'} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-medium text-slate-200 truncate">{ev.title || ev.sourceUrl || 'Untitled'}</div>
                    <div className="text-[10px] text-slate-500 truncate">{fmtDateTime(ev.capturedAt)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <EvidenceDetail
            ev={selected}
            onClose={() => setSelected(null)}
            onRemove={() => remove(selected)}
            onAddToGraph={() => addToGraph(selected)}
            onNote={async (note) => {
              await api.evidence.setNote(selected.id, note)
              setItems((prev) => prev.map((x) => (x.id === selected.id ? { ...x, note } : x)))
              setSelected((s) => (s ? { ...s, note } : s))
            }}
            onOcr={async (ocr) => {
              await api.evidence.setOcr(selected.id, ocr)
              setItems((prev) => prev.map((x) => (x.id === selected.id ? { ...x, ocr } : x)))
              setSelected((s) => (s ? { ...s, ocr } : s))
            }}
            onTitle={async (title) => {
              await api.evidence.setTitle(selected.id, title)
              setItems((prev) => prev.map((x) => (x.id === selected.id ? { ...x, title } : x)))
              setSelected((s) => (s ? { ...s, title } : s))
            }}
          />
        )}
      </div>

      {/* Drag overlay */}
      {dragging && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink-950/80 border-4 border-dashed border-brand/50 m-2 rounded-2xl pointer-events-none">
          <div className="text-center">
            <Upload size={40} className="text-brand-glow mx-auto mb-2" />
            <div className="text-slate-200 font-semibold">Drop images to add them to evidence</div>
          </div>
        </div>
      )}

      {toast && (
        <div className="absolute bottom-5 right-5 z-40 card px-4 py-2.5 text-sm text-slate-200 border-accent/40 shadow-xl">{toast}</div>
      )}
    </div>
  )
}

function CopyChip({ label, value }: { label: string; value: string }): JSX.Element {
  const [done, setDone] = useState(false)
  return (
    <button
      className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 font-mono break-all text-left"
      onClick={async () => {
        await api.clipboard.writeText(value)
        setDone(true)
        setTimeout(() => setDone(false), 1200)
      }}
      title={`Copy ${label}`}
    >
      {done ? <Check size={11} className="text-ok shrink-0" /> : <Copy size={11} className="shrink-0" />}
      <span className="break-all">{value}</span>
    </button>
  )
}

function EvidenceDetail({
  ev,
  onClose,
  onRemove,
  onAddToGraph,
  onNote,
  onOcr,
  onTitle
}: {
  ev: Evidence
  onClose: () => void
  onRemove: () => void
  onAddToGraph: () => void
  onNote: (note: string) => void
  onOcr: (ocr: string) => void
  onTitle: (title: string) => void
}): JSX.Element {
  const openInBrowser = useOpenInBrowser()
  const openTabs = useOpenTabs()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [exif, setExif] = useState<ExifResult | null>(null)
  const [title, setTitle] = useState(ev.title ?? '')
  const [note, setNote] = useState(ev.note ?? '')
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrErr, setOcrErr] = useState('')
  const [verify, setVerify] = useState<EvidenceVerify | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [geo, setGeo] = useState<{ lat: number | null; lng: number | null; label: string }>({
    lat: ev.geoLat ?? null,
    lng: ev.geoLng ?? null,
    label: ev.geoLabel ?? ''
  })
  const [aiGeo, setAiGeo] = useState<GeoResult | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiErr, setAiErr] = useState('')
  const [manual, setManual] = useState({ lat: '', lng: '', label: '' })
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const [lightbox, setLightbox] = useState(false)
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setLightbox(false)
        setZoom(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  useEffect(() => {
    setTitle(ev.title ?? '')
    setNote(ev.note ?? '')
    setVerify(null)
    setAiGeo(null)
    setAiErr('')
    setGeo({ lat: ev.geoLat ?? null, lng: ev.geoLng ?? null, label: ev.geoLabel ?? '' })
    setManual({ lat: '', lng: '', label: '' })
    if (ev.kind !== 'file') api.files.exif(ev.path).then(setExif)
    else setExif(null)
  }, [ev.id, ev.path, ev.kind, ev.note, ev.title, ev.geoLat, ev.geoLng, ev.geoLabel])

  const pinManual = async (): Promise<void> => {
    const lat = parseFloat(manual.lat)
    const lng = parseFloat(manual.lng)
    if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return
    await pinOnMap(lat, lng, manual.label.trim() || 'Manual location', false)
  }

  // Drop a found location onto the case map (persisted on the exhibit).
  const pinOnMap = async (lat: number, lng: number, label: string, goToMap = true): Promise<void> => {
    await api.evidence.setGeo(ev.id, lat, lng, label)
    setGeo({ lat, lng, label })
    if (goToMap) navigate('/map')
  }
  const clearPin = async (): Promise<void> => {
    await api.evidence.setGeo(ev.id, null, null, '')
    setGeo({ lat: null, lng: null, label: '' })
  }

  const runAiGeo = async (): Promise<void> => {
    setAiBusy(true)
    setAiErr('')
    try {
      setAiGeo(await api.intel.geolocate(ev.id))
    } catch (e) {
      setAiErr(String((e as Error)?.message ?? e))
    } finally {
      setAiBusy(false)
    }
  }

  // Reverse image search: copy the image to the clipboard, stage it in the
  // browser's paste panel (so it can be re-copied), then open the engine. The
  // user pastes (Ctrl+V) into the engine — reliable across all of them, unlike
  // per-site auto-upload.
  const reverseSearch = async (engineUrl: string): Promise<void> => {
    const dataUrl = await api.files.dataUrl(ev.path)
    if (dataUrl) {
      await api.clipboard.writeImage(dataUrl)
      setPasteImage({ dataUrl, label: ev.title || ev.sourceUrl || 'Evidence image' })
    }
    openTabs([{ url: engineUrl }])
  }

  const doVerify = async (): Promise<void> => {
    setVerifying(true)
    try {
      setVerify(await api.evidence.verify(ev.id))
    } finally {
      setVerifying(false)
    }
  }

  const runOcr = async (): Promise<void> => {
    setOcrBusy(true)
    setOcrErr('')
    try {
      const text = await api.evidence.ocr(ev.id)
      onOcr(text)
      if (!text) setOcrErr('No readable text found in this image.')
    } catch (e) {
      setOcrErr(`OCR failed: ${String((e as Error)?.message ?? e)}`)
    } finally {
      setOcrBusy(false)
    }
  }

  const openaiKey = !!settings.apiKeys?.openai

  return (
    <div className="w-96 shrink-0 border-l border-ink-700 bg-ink-900 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700">
        <span className="font-semibold text-slate-100">Evidence</span>
        <button className="btn-ghost !p-1.5" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {ev.kind !== 'file' && (
          <button
            type="button"
            className="block w-full rounded-lg border border-ink-700 overflow-hidden cursor-zoom-in group relative"
            onClick={() => setLightbox(true)}
            title="Click to view full size"
          >
            <img src={ev.path} alt={ev.title || 'evidence'} className="w-full" />
            <span className="absolute bottom-1.5 right-1.5 bg-ink-950/80 text-slate-200 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 size={14} />
            </span>
          </button>
        )}

        {/* Caption / title */}
        <div>
          <div className="label">Caption</div>
          <input
            className="input"
            placeholder="Describe this image…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== (ev.title ?? '') && onTitle(title)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </div>

        {lightbox && ev.kind !== 'file' && (
          <div
            className="fixed inset-0 z-[120] bg-black/95 flex flex-col"
            onClick={() => {
              setLightbox(false)
              setZoom(false)
            }}
          >
            <div className="flex items-center justify-between px-4 py-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <span className="text-sm text-slate-300 truncate">{ev.title || ev.sourceUrl || 'Evidence'}</span>
              <div className="flex items-center gap-1.5">
                <button className="btn-ghost !p-1.5 text-slate-200" onClick={() => setZoom((z) => !z)} title={zoom ? 'Fit to screen' : 'Actual size'}>
                  {zoom ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
                </button>
                <button
                  className="btn-ghost !p-1.5 text-slate-200"
                  onClick={() => {
                    setLightbox(false)
                    setZoom(false)
                  }}
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4">
              <img
                src={ev.path}
                alt=""
                onClick={(e) => {
                  e.stopPropagation()
                  setZoom((z) => !z)
                }}
                className={zoom ? 'max-w-none cursor-zoom-out' : 'max-h-full max-w-full object-contain cursor-zoom-in'}
              />
            </div>
          </div>
        )}

        {/* Reverse image search */}
        {ev.kind !== 'file' && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <ScanSearch size={14} className="text-accent" />
              <span className="label !mb-0">Reverse image search</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REVERSE.map((eng) => (
                <button
                  key={eng.label}
                  className="btn-ghost border border-ink-600 text-xs"
                  onClick={() => reverseSearch(eng.upload)}
                  title={`Copy image + open ${eng.label} — then press Ctrl+V`}
                >
                  {eng.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-600 mt-1.5">
              The image is copied to your clipboard and the engine opens in the in-app browser — click its upload box and press <b>Ctrl+V</b>. It stays pinned on the right so you can re-copy anytime.
            </p>
          </div>
        )}

        {/* Geolocate — where was this taken? */}
        {ev.kind !== 'file' && (
          <div className="rounded-lg border border-ink-700 p-2.5 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Compass size={14} className="text-accent" />
              <span className="label !mb-0">Geolocate</span>
            </div>

            {/* Assigned pin */}
            {geo.lat != null && geo.lng != null ? (
              <div className="flex items-start gap-1.5 text-xs bg-ok/10 text-ok rounded-md px-2 py-1.5">
                <MapPinned size={13} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {renaming ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        className="input !py-1 text-xs flex-1"
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            await api.evidence.setGeo(ev.id, geo.lat, geo.lng, renameVal.trim())
                            setGeo((g) => ({ ...g, label: renameVal.trim() }))
                            setRenaming(false)
                          } else if (e.key === 'Escape') setRenaming(false)
                        }}
                      />
                      <button
                        className="underline hover:opacity-80"
                        onClick={async () => {
                          await api.evidence.setGeo(ev.id, geo.lat, geo.lng, renameVal.trim())
                          setGeo((g) => ({ ...g, label: renameVal.trim() }))
                          setRenaming(false)
                        }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="font-medium break-words">{geo.label || 'Pinned location'}</div>
                  )}
                  <div className="opacity-80">{geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}</div>
                  <div className="flex gap-2 mt-1">
                    <button className="underline hover:opacity-80" onClick={() => navigate('/map')}>View on map</button>
                    <button className="underline hover:opacity-80" onClick={() => { setRenameVal(geo.label || ''); setRenaming(true) }}>Rename</button>
                    <button className="underline hover:opacity-80" onClick={clearPin}>Clear</button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">No location pinned yet.</p>
            )}

            {/* From EXIF GPS */}
            {exif?.gps && (
              <button
                className="btn-ghost border border-ink-600 text-xs w-full justify-center"
                onClick={() => pinOnMap(exif.gps!.lat, exif.gps!.lng, 'EXIF GPS', false)}
              >
                <MapPin size={13} /> Pin EXIF GPS ({exif.gps.lat.toFixed(4)}, {exif.gps.lng.toFixed(4)})
              </button>
            )}

            {/* Manual entry */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-500">Set a location by hand</div>
              <div className="flex gap-1.5">
                <input
                  className="input !py-1 text-xs"
                  placeholder="Latitude"
                  value={manual.lat}
                  onChange={(e) => setManual((m) => ({ ...m, lat: e.target.value }))}
                />
                <input
                  className="input !py-1 text-xs"
                  placeholder="Longitude"
                  value={manual.lng}
                  onChange={(e) => setManual((m) => ({ ...m, lng: e.target.value }))}
                />
              </div>
              <input
                className="input !py-1 text-xs"
                placeholder="Label (e.g. café on the corner)"
                value={manual.label}
                onChange={(e) => setManual((m) => ({ ...m, label: e.target.value }))}
              />
              <button
                className="btn-ghost border border-ink-600 text-xs w-full justify-center disabled:opacity-40"
                onClick={pinManual}
                disabled={!manual.lat.trim() || !manual.lng.trim()}
              >
                <MapPinned size={13} /> Pin this location
              </button>
            </div>

            {/* Geo tools (in-app browser). Street View / Earth need coordinates. */}
            <div className="flex flex-wrap gap-1.5">
              <button
                className="btn-ghost border border-ink-600 text-[11px] disabled:opacity-40"
                disabled={geo.lat == null || geo.lng == null}
                onClick={() => openInBrowser([`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${geo.lat},${geo.lng}`])}
                title={geo.lat == null ? 'Pin a location first' : 'Google Street View at the pinned location'}
              >
                <Globe size={12} /> Street View
              </button>
              <button
                className="btn-ghost border border-ink-600 text-[11px] disabled:opacity-40"
                disabled={geo.lat == null || geo.lng == null}
                onClick={() => openInBrowser([`https://earth.google.com/web/@${geo.lat},${geo.lng},100a,1000d`])}
                title={geo.lat == null ? 'Pin a location first' : 'Google Earth at the pinned location'}
              >
                <Globe size={12} /> Earth
              </button>
              <button
                className="btn-ghost border border-ink-600 text-[11px]"
                onClick={() => openInBrowser(['https://www.suncalc.org/'])}
                title="Estimate time-of-day from shadows"
              >
                <Globe size={12} /> SunCalc
              </button>
            </div>

            {/* AI best guess */}
            <div className="border-t border-ink-800 pt-2">
              <button
                className="btn-ghost border border-ink-600 text-xs w-full justify-center disabled:opacity-50"
                onClick={runAiGeo}
                disabled={aiBusy || !openaiKey}
                title={openaiKey ? 'Ask the OpenAI vision model where this was taken' : 'Add an OpenAI API key in Settings'}
              >
                {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} className="text-accent" />}
                {aiBusy ? 'Analyzing image…' : 'AI best guess (OpenAI)'}
              </button>
              {!openaiKey && (
                <button className="text-[11px] text-brand-glow hover:underline mt-1" onClick={() => navigate('/settings')}>
                  Add an OpenAI API key in Settings →
                </button>
              )}
              {aiErr && <div className="text-[11px] text-warn mt-1">{aiErr}</div>}
              {aiGeo && (
                <div className="mt-2 space-y-1.5">
                  {aiGeo.summary && <p className="text-[11px] text-slate-400">{aiGeo.summary}</p>}
                  {aiGeo.guesses.length === 0 && !aiGeo.summary && (
                    <p className="text-[11px] text-slate-500">No confident location from the visible cues.</p>
                  )}
                  {aiGeo.guesses.map((g, i) => (
                    <div key={i} className="rounded-md border border-ink-700 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-200 break-words">
                          {g.place}
                          {g.country ? `, ${g.country}` : ''}
                        </span>
                        {g.confidence != null && <span className="text-[10px] text-slate-500 shrink-0">{Math.round(g.confidence)}%</span>}
                      </div>
                      {g.reasoning && <div className="text-[11px] text-slate-500 mt-0.5">{g.reasoning}</div>}
                      {g.lat != null && g.lng != null && (
                        <button
                          className="text-[11px] text-brand-glow hover:underline mt-1 flex items-center gap-1"
                          onClick={() => pinOnMap(g.lat!, g.lng!, `${g.place}${g.country ? `, ${g.country}` : ''}`)}
                        >
                          <MapPinned size={11} /> Pin on map
                        </button>
                      )}
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-600">AI estimate — verify before relying on it.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chain of custody */}
        <div className="space-y-2">
          <div className="rounded-lg border border-ink-700 p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Chain of custody</div>
              <button
                className="text-[11px] text-slate-400 hover:text-accent-glow flex items-center gap-1 disabled:opacity-50"
                onClick={doVerify}
                disabled={verifying}
                title="Re-hash the stored file and compare to the hash recorded at capture"
              >
                {verifying ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                {verifying ? 'Checking…' : 'Verify integrity'}
              </button>
            </div>
            <div>
              <div className="label">Captured</div>
              <div className="text-sm text-slate-300">{fmtDateTime(ev.capturedAt)}</div>
            </div>
            {ev.sourceUrl && (
              <div>
                <div className="label">Source</div>
                <button className="text-xs text-brand-glow hover:underline break-all text-left" onClick={() => api.shell.openExternal(ev.sourceUrl!)}>
                  {ev.sourceUrl}
                </button>
              </div>
            )}
            {ev.sha256 && (
              <div>
                <div className="label">SHA-256 (at capture)</div>
                <CopyChip label="SHA-256" value={ev.sha256} />
              </div>
            )}
            {verify && (
              <div
                className={`flex items-start gap-1.5 text-xs rounded-md px-2 py-1.5 ${
                  verify.status === 'altered'
                    ? 'bg-warn/10 text-warn'
                    : verify.status === 'missing'
                      ? 'bg-warn/10 text-warn'
                      : 'bg-ok/10 text-ok'
                }`}
              >
                {verify.status === 'altered' || verify.status === 'missing' ? (
                  <ShieldAlert size={13} className="shrink-0 mt-0.5" />
                ) : verify.status === 'recorded' ? (
                  <ShieldQuestion size={13} className="shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck size={13} className="shrink-0 mt-0.5" />
                )}
                <span>
                  {verify.status === 'verified' &&
                    `Verified — file is unaltered since capture (${(verify.sizeBytes / 1024).toFixed(1)} KB).`}
                  {verify.status === 'altered' &&
                    'Mismatch — the stored file no longer matches its capture hash. It may have been modified.'}
                  {verify.status === 'recorded' &&
                    `Hash recorded now (this exhibit predates hashing) — future checks will verify against it.`}
                  {verify.status === 'missing' && 'The stored file could not be found.'}
                </span>
              </div>
            )}
          </div>
          {exif && (
            <div className="rounded-lg border border-ink-700 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">Metadata</div>
                {exif.all && Object.keys(exif.all).length > 0 && (
                  <button
                    className="text-[11px] text-slate-500 hover:text-accent-glow flex items-center gap-1"
                    onClick={() =>
                      api.clipboard.writeText(
                        Object.entries(exif.all!)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join('\n')
                      )
                    }
                  >
                    <Copy size={11} /> Copy all
                  </button>
                )}
              </div>
              {exif.gps && (
                <button
                  className="flex items-center gap-1.5 text-sm text-brand-glow hover:underline"
                  title="Open this location in the in-app browser"
                  onClick={() => openInBrowser([`https://www.google.com/maps?q=${exif.gps!.lat},${exif.gps!.lng}`])}
                >
                  <MapPin size={13} /> {exif.gps.lat.toFixed(5)}, {exif.gps.lng.toFixed(5)}
                </button>
              )}
              {exif.fileSize ? <div className="text-xs text-slate-400">📦 {(exif.fileSize / 1024).toFixed(1)} KB</div> : null}
              {exif.all && Object.keys(exif.all).length > 0 ? (
                <div className="max-h-56 overflow-y-auto mt-1 divide-y divide-ink-800 border-t border-ink-800">
                  {Object.entries(exif.all).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[40%_60%] gap-2 py-1">
                      <div className="text-[11px] text-slate-500 truncate" title={k}>{k}</div>
                      <div className="text-[11px] text-slate-300 break-words">{v}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500">No embedded metadata (it may have been stripped by the site/platform).</div>
              )}
            </div>
          )}
        </div>

        {/* OCR — extract text from the image */}
        {ev.kind !== 'file' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <ScanText size={14} className="text-accent" />
                <span className="label !mb-0">Text (OCR)</span>
              </div>
              <div className="flex items-center gap-2">
                {ev.ocr && (
                  <button
                    className="text-[11px] text-slate-500 hover:text-accent-glow flex items-center gap-1"
                    onClick={() => api.clipboard.writeText(ev.ocr!)}
                  >
                    <Copy size={11} /> Copy
                  </button>
                )}
                <button className="btn-ghost border border-ink-600 !px-2 !py-1 text-xs" onClick={runOcr} disabled={ocrBusy}>
                  {ocrBusy ? <Loader2 size={12} className="animate-spin" /> : <ScanText size={12} />}
                  {ocrBusy ? 'Reading…' : ev.ocr ? 'Re-run' : 'Run OCR'}
                </button>
              </div>
            </div>
            {ocrErr && <div className="text-[11px] text-warn mb-1">{ocrErr}</div>}
            {ev.ocr ? (
              <>
                <pre className="text-[11px] text-slate-300 whitespace-pre-wrap break-words bg-ink-950 border border-ink-700 rounded-lg p-2 max-h-48 overflow-y-auto font-sans">{ev.ocr}</pre>
                <button className="text-[11px] text-brand-glow hover:underline mt-1 flex items-center gap-1" onClick={() => onNote((note ? note + '\n\n' : '') + ev.ocr)}>
                  <NotebookPen size={11} /> Append to note
                </button>
              </>
            ) : (
              !ocrBusy && <div className="text-xs text-slate-500">Extract any text in this image (logos, documents, screenshots).</div>
            )}
          </div>
        )}

        {/* Note */}
        <div>
          <div className="label">Note</div>
          <textarea
            className="input min-h-[70px] resize-y"
            placeholder="Add context for this evidence…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (ev.note ?? '') && onNote(note)}
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary justify-center" onClick={onAddToGraph}>
              <Workflow size={15} /> Add to chart
            </button>
            <button
              className="btn-ghost border border-ink-600 justify-center"
              onClick={() => api.files.saveCopy(ev.path, (ev.title || 'evidence').replace(/[^a-z0-9._-]/gi, '_') + '.png')}
            >
              <Download size={15} /> Save copy
            </button>
          </div>
          <button className="btn-danger justify-center w-full" onClick={onRemove}>
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}
