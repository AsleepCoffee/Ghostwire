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
  Workflow,
  Download,
  FileText,
  Loader2
} from 'lucide-react'
import { api, type Evidence, type Project, type ExifResult } from '../lib/api'
import { useSettings } from '../lib/settings'
import { useConfirm } from '../lib/confirm'
import { useOpenInBrowser } from '../lib/browserBus'
import { fmtDateTime } from '../lib/format'
import { EmptyState } from '../components/ui'

const enc = encodeURIComponent
const IMG_EXT = /\.(jpe?g|png|gif|webp|bmp|avif)(\?|#|$)/i

/** Reverse-image-search engines. byUrl works when we have a direct image URL;
 *  otherwise we open the engine so you can drop the saved file in. */
const REVERSE = [
  { label: 'Google Lens', byUrl: (u: string) => `https://lens.google.com/uploadbyurl?url=${enc(u)}`, home: 'https://lens.google.com/' },
  { label: 'Yandex', byUrl: (u: string) => `https://yandex.com/images/search?rpt=imageview&url=${enc(u)}`, home: 'https://yandex.com/images/' },
  { label: 'Bing', byUrl: (u: string) => `https://www.bing.com/images/searchbyimage?cbir=sbi&imgurl=${enc(u)}`, home: 'https://www.bing.com/visualsearch' },
  { label: 'TinEye', byUrl: (u: string) => `https://tineye.com/search?url=${enc(u)}`, home: 'https://tineye.com/' },
  { label: 'PimEyes (faces)', byUrl: null, home: 'https://pimeyes.com/en' }
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
  const fileRef = useRef<HTMLInputElement>(null)

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

      {/* Gallery */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <EmptyState
              icon="Images"
              title="No evidence yet"
              subtitle="Drag images here, paste a screenshot (Ctrl+V), paste an image URL, or use the in-app Browser's capture button."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {items.map((ev) => (
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
  onNote
}: {
  ev: Evidence
  onClose: () => void
  onRemove: () => void
  onAddToGraph: () => void
  onNote: (note: string) => void
}): JSX.Element {
  const openInBrowser = useOpenInBrowser()
  const [exif, setExif] = useState<ExifResult | null>(null)
  const [note, setNote] = useState(ev.note ?? '')

  useEffect(() => {
    setNote(ev.note ?? '')
    if (ev.kind !== 'file') api.files.exif(ev.path).then(setExif)
    else setExif(null)
  }, [ev.id, ev.path, ev.kind, ev.note])

  const imageUrl = ev.sourceUrl && IMG_EXT.test(ev.sourceUrl) ? ev.sourceUrl : null

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
          <img src={ev.path} alt={ev.title || 'evidence'} className="w-full rounded-lg border border-ink-700" />
        )}

        {/* Reverse image search */}
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
                onClick={() => openInBrowser([imageUrl && eng.byUrl ? eng.byUrl(imageUrl) : eng.home])}
                title={imageUrl && eng.byUrl ? `Search this image on ${eng.label} (in-app)` : `Open ${eng.label} in-app — then upload the saved image`}
              >
                {eng.label}
              </button>
            ))}
          </div>
          {!imageUrl && (
            <p className="text-[11px] text-slate-600 mt-1.5">
              No direct image URL — click <b>Save copy</b> below, then drop the file into the engine.
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-2">
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
              <div className="label">SHA-256</div>
              <CopyChip label="SHA-256" value={ev.sha256} />
            </div>
          )}
          {exif && (exif.gps || exif.make || exif.model || exif.dateTime || exif.software) && (
            <div className="rounded-lg border border-ink-700 p-2.5 space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">EXIF metadata</div>
              {exif.gps && (
                <button
                  className="flex items-center gap-1.5 text-sm text-brand-glow hover:underline"
                  onClick={() => api.shell.openExternal(`https://www.google.com/maps?q=${exif.gps!.lat},${exif.gps!.lng}`)}
                >
                  <MapPin size={13} /> {exif.gps.lat.toFixed(5)}, {exif.gps.lng.toFixed(5)}
                </button>
              )}
              {(exif.make || exif.model) && <div className="text-xs text-slate-400">📷 {[exif.make, exif.model].filter(Boolean).join(' ')}</div>}
              {exif.dateTime && <div className="text-xs text-slate-400">🕑 {exif.dateTime}</div>}
              {exif.software && <div className="text-xs text-slate-400">🛠 {exif.software}</div>}
            </div>
          )}
        </div>

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
