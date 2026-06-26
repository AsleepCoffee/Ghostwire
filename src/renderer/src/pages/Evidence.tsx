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
  ShieldQuestion
} from 'lucide-react'
import { api, type Evidence, type Project, type ExifResult, type EvidenceVerify } from '../lib/api'
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
  onOcr
}: {
  ev: Evidence
  onClose: () => void
  onRemove: () => void
  onAddToGraph: () => void
  onNote: (note: string) => void
  onOcr: (ocr: string) => void
}): JSX.Element {
  const openInBrowser = useOpenInBrowser()
  const [exif, setExif] = useState<ExifResult | null>(null)
  const [note, setNote] = useState(ev.note ?? '')
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrErr, setOcrErr] = useState('')
  const [verify, setVerify] = useState<EvidenceVerify | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    setNote(ev.note ?? '')
    setVerify(null)
    if (ev.kind !== 'file') api.files.exif(ev.path).then(setExif)
    else setExif(null)
  }, [ev.id, ev.path, ev.kind, ev.note])

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
                  onClick={() => api.shell.openExternal(`https://www.google.com/maps?q=${exif.gps!.lat},${exif.gps!.lng}`)}
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
