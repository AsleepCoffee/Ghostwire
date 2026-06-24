import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Plus,
  Search,
  Trash2,
  Pin,
  PinOff,
  Eye,
  Pencil,
  FileDown,
  FolderUp,
  X,
  Tag,
  ImagePlus
} from 'lucide-react'
import { api, type Note, type Project } from '../lib/api'
import { EmptyState } from '../components/ui'

export function Notes(): JSX.Element {
  const [params] = useSearchParams()
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [folderFilter, setFolderFilter] = useState<string>(params.get('folder') ?? 'All')
  const [preview, setPreview] = useState(false)
  const [toast, setToast] = useState('')
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  const load = async (selectId?: string): Promise<void> => {
    const list = await api.notes.list()
    setNotes(list)
    if (selectId) setActiveId(selectId)
    else if (!activeId && list.length) setActiveId(list[0].id)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const folders = useMemo(
    () => ['All', ...Array.from(new Set(notes.map((n) => n.folder))).sort()],
    [notes]
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return notes.filter(
      (n) =>
        (folderFilter === 'All' || n.folder === folderFilter) &&
        (!q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
    )
  }, [notes, query, folderFilter])

  const active = notes.find((n) => n.id === activeId) ?? null

  const flash = (msg: string): void => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const newNote = async (): Promise<void> => {
    const saved = await api.notes.save({
      title: 'Untitled note',
      body: '# Untitled note\n\n',
      folder: folderFilter === 'All' ? 'Inbox' : folderFilter
    })
    await load(saved.id)
  }

  const patch = (patch: Partial<Note>): void => {
    if (!active) return
    const updated = { ...active, ...patch }
    setNotes((prev) => prev.map((n) => (n.id === active.id ? updated : n)))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      api.notes.save(updated)
    }, 600)
  }

  const remove = async (n: Note): Promise<void> => {
    if (!confirm(`Delete note "${n.title}"?`)) return
    await api.notes.remove(n.id)
    setActiveId(null)
    load()
  }

  const exportOne = async (): Promise<void> => {
    if (!active) return
    const path = await api.notes.exportOne(active.id)
    if (!path) {
      const dir = await api.settings.pickVault()
      if (dir) {
        const p2 = await api.notes.exportOne(active.id)
        if (p2) flash('Exported to vault')
      }
      return
    }
    flash('Exported to vault')
  }

  const exportAll = async (): Promise<void> => {
    let res = await api.notes.exportAll()
    if (!res) {
      const dir = await api.settings.pickVault()
      if (!dir) return
      res = await api.notes.exportAll()
    }
    if (res) flash(`Exported ${res.exported} notes → ${res.dir}`)
  }

  return (
    <div className="h-full flex">
      {/* List */}
      <div className="w-80 shrink-0 border-r border-ink-700 flex flex-col">
        <div className="p-3 border-b border-ink-700 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-slate-100">Notes</h1>
            <div className="flex gap-1">
              <button className="btn-ghost !px-2" onClick={exportAll} title="Export all to Obsidian vault">
                <FolderUp size={16} />
              </button>
              <button className="btn-primary !px-2" onClick={newNote} title="New note">
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="input pl-8 py-1.5 text-sm"
              placeholder="Search notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input py-1.5 text-sm"
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value)}
          >
            {folders.map((f) => (
              <option key={f} value={f}>
                {f === 'All' ? 'All folders' : f}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">No notes here yet.</div>
          ) : (
            filtered.map((n) => (
              <button
                key={n.id}
                onClick={() => setActiveId(n.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-ink-800 hover:bg-ink-800 transition-colors ${
                  activeId === n.id ? 'bg-ink-800 border-l-2 border-l-brand' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {n.pinned && <Pin size={12} className="text-warn shrink-0" />}
                  <span className="font-medium text-slate-200 truncate">{n.title || 'Untitled'}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] chip">{n.folder}</span>
                  <span className="text-[11px] text-slate-600">
                    {new Date(n.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-w-0 flex flex-col">
        {!active ? (
          <EmptyState
            icon="NotebookPen"
            title="Select or create a note"
            subtitle="Your notes are written in Markdown and export cleanly to your Obsidian vault."
            action={
              <button className="btn-primary" onClick={newNote}>
                <Plus size={16} /> New note
              </button>
            }
          />
        ) : (
          <NoteEditor
            note={active}
            preview={preview}
            onTogglePreview={() => setPreview((p) => !p)}
            onPatch={patch}
            onDelete={() => remove(active)}
            onExport={exportOne}
          />
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 card px-4 py-2.5 text-sm text-ok border-ok/30 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}

function NoteEditor({
  note,
  preview,
  onTogglePreview,
  onPatch,
  onDelete,
  onExport
}: {
  note: Note
  preview: boolean
  onTogglePreview: () => void
  onPatch: (p: Partial<Note>) => void
  onDelete: () => void
  onExport: () => void
}): JSX.Element {
  const [tagInput, setTagInput] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    api.projects.list().then(setProjects)
  }, [])
  const addTag = (): void => {
    const t = tagInput.trim()
    if (t && !note.tags.includes(t)) onPatch({ tags: [...note.tags, t] })
    setTagInput('')
  }

  const insertAtCursor = (text: string): void => {
    const el = bodyRef.current
    const body = note.body
    if (!el) {
      onPatch({ body: `${body}\n${text}\n` })
      return
    }
    const start = el.selectionStart ?? body.length
    const end = el.selectionEnd ?? body.length
    onPatch({ body: body.slice(0, start) + text + body.slice(end) })
  }

  const insertImageFile = async (): Promise<void> => {
    const url = await api.files.pickImage('notes')
    if (url) insertAtCursor(`\n![image](${url})\n`)
  }

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>): Promise<void> => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    if (!item) return
    e.preventDefault()
    const file = item.getAsFile()
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (): Promise<void> => {
      const url = await api.files.saveDataUrl(String(reader.result), 'notes')
      insertAtCursor(`\n![pasted image](${url})\n`)
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <div className="p-4 border-b border-ink-700 space-y-3">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 bg-transparent text-xl font-bold text-slate-100 outline-none placeholder:text-slate-600"
            value={note.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            placeholder="Note title"
          />
          <button className="btn-ghost !px-2" onClick={() => onPatch({ pinned: !note.pinned })} title="Pin">
            {note.pinned ? <PinOff size={17} /> : <Pin size={17} />}
          </button>
          <button className="btn-ghost !px-2" onClick={insertImageFile} title="Insert image">
            <ImagePlus size={17} />
          </button>
          <button className="btn-ghost" onClick={onTogglePreview}>
            {preview ? <Pencil size={16} /> : <Eye size={16} />}
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button className="btn-ghost" onClick={onExport} title="Export this note to vault">
            <FileDown size={16} /> Export
          </button>
          <button className="btn-danger !px-2" onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Folder</span>
            <input
              className="input !w-36 py-1 text-sm"
              value={note.folder}
              onChange={(e) => onPatch({ folder: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Investigation</span>
            <select
              className="input !w-44 py-1 text-sm"
              value={note.projectId ?? ''}
              onChange={(e) => onPatch({ projectId: e.target.value || null })}
            >
              <option value="">— none —</option>
              {projects.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag size={13} className="text-slate-500" />
            {note.tags.map((t) => (
              <span key={t} className="chip">
                {t}
                <button onClick={() => onPatch({ tags: note.tags.filter((x) => x !== t) })}>
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              className="input !w-28 py-1 text-sm"
              placeholder="add tag…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {preview ? (
          <div className="h-full overflow-y-auto p-6 md-preview max-w-3xl mx-auto">
            <Markdown remarkPlugins={[remarkGfm]}>{note.body || '*Nothing here yet.*'}</Markdown>
          </div>
        ) : (
          <textarea
            ref={bodyRef}
            className="w-full h-full bg-ink-950 text-slate-200 font-mono text-sm leading-relaxed p-6 outline-none resize-none"
            value={note.body}
            onChange={(e) => onPatch({ body: e.target.value })}
            onPaste={onPaste}
            placeholder="# Start writing in Markdown…  (paste or insert images too)"
            spellCheck={false}
          />
        )}
      </div>
    </>
  )
}
