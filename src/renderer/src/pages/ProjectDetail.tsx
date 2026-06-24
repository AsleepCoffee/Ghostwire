import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Crosshair,
  Drama,
  NotebookPen,
  Workflow,
  Globe,
  Link2,
  Unlink,
  Fingerprint,
  Lightbulb,
  Target
} from 'lucide-react'
import {
  api,
  type Project,
  type Persona,
  type Note,
  type Board,
  type ProjectStatus
} from '../lib/api'
import { PROJECT_TYPES, personaColor } from '../lib/constants'
import { Icon, StatusBadge } from '../components/ui'
import { ProjectEditor } from './Projects'
import { PivotModal } from '../components/PivotModal'
import { useOpenInBrowser } from '../lib/browserBus'
import { useConfirm } from '../lib/confirm'
import type { PivotSubject } from '../lib/pivot'

const subjectForType: Record<Project['type'], PivotSubject> = {
  person: 'name',
  company: 'organization',
  other: 'generic'
}

export function ProjectDetail(): JSX.Element {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const openInBrowser = useOpenInBrowser()
  const confirm = useConfirm()
  const [project, setProject] = useState<Project | null>(null)
  const [contents, setContents] = useState<{ personas: Persona[]; notes: Note[]; boards: Board[] }>({
    personas: [],
    notes: [],
    boards: []
  })
  const [allPersonas, setAllPersonas] = useState<Persona[]>([])
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const [allBoards, setAllBoards] = useState<Board[]>([])
  const [editing, setEditing] = useState(false)
  const [pivotOpen, setPivotOpen] = useState(false)
  const [known, setKnown] = useState('')
  const [objectives, setObjectives] = useState('')
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  const load = async (): Promise<void> => {
    const p = await api.projects.get(id)
    setProject(p)
    if (p) {
      setKnown(p.known)
      setObjectives(p.objectives)
    }
    setContents(await api.projects.contents(id))
    setAllPersonas(await api.personas.list())
    setAllNotes(await api.notes.list())
    setAllBoards(await api.boards.list())
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const patchProject = (patch: Partial<Project>): void => {
    if (!project) return
    const updated = { ...project, ...patch }
    setProject(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => api.projects.save(updated), 500)
  }

  const remove = async (): Promise<void> => {
    if (!project) return
    if (!(await confirm({ title: `Delete investigation “${project.name}”?`, message: 'Linked personas, notes, and boards are kept — just unlinked from this investigation.', confirmText: 'Delete', danger: true }))) return
    await api.projects.remove(project.id)
    nav('/projects')
  }

  // ---- linking helpers ----
  const linkPersona = async (p: Persona, on: boolean): Promise<void> => {
    await api.personas.save({ ...p, projectId: on ? id : null })
    load()
  }
  const linkNote = async (n: Note, on: boolean): Promise<void> => {
    await api.notes.save({ ...n, projectId: on ? id : null })
    load()
  }
  const linkBoard = async (b: Board, on: boolean): Promise<void> => {
    await api.boards.save({ ...b, projectId: on ? id : null })
    load()
  }

  const newPersona = async (): Promise<void> => {
    const saved = await api.personas.save({
      name: `${project?.subject || project?.name || 'New'} persona`,
      status: 'draft',
      projectId: id,
      accounts: [],
      tags: []
    })
    await load()
    nav('/sock-puppets')
    void saved
  }
  const newNote = async (): Promise<void> => {
    await api.notes.save({
      title: `${project?.name} — notes`,
      body: `# ${project?.name}\n\n`,
      folder: project?.name || 'Investigations',
      projectId: id
    })
    await load()
    nav('/notes')
  }
  const newBoard = async (): Promise<void> => {
    await api.boards.save({ name: `${project?.name} — link chart`, projectId: id })
    await load()
    nav('/graph')
  }

  if (!project) {
    return <div className="p-8 text-slate-500">Loading…</div>
  }

  const cfg = PROJECT_TYPES[project.type]
  const unlinkedPersonas = allPersonas.filter((p) => p.projectId !== id)
  const unlinkedNotes = allNotes.filter((n) => n.projectId !== id)
  const unlinkedBoards = allBoards.filter((b) => b.projectId !== id)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button className="btn-ghost !px-2" onClick={() => nav('/projects')}>
            <ArrowLeft size={18} />
          </button>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${cfg.color}1f`, border: `1px solid ${cfg.color}44` }}
          >
            <Icon name={cfg.icon} size={22} style={{ color: cfg.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-100 truncate">{project.name}</h1>
            <div className="text-sm text-slate-500">
              {cfg.label}
              {project.subject ? ` · ${project.subject}` : ''}
            </div>
          </div>
          <select
            className="input !w-auto py-1.5"
            value={project.status}
            onChange={(e) => patchProject({ status: e.target.value as ProjectStatus })}
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
          {project.subject && (
            <button className="btn-primary" onClick={() => setPivotOpen(true)}>
              <Crosshair size={15} /> Search target
            </button>
          )}
          <button className="btn-ghost !px-2" onClick={() => setEditing(true)} title="Edit details">
            <Pencil size={17} />
          </button>
          <button className="btn-danger !px-2" onClick={remove} title="Delete investigation">
            <Trash2 size={17} />
          </button>
        </div>

        {/* Known / Objectives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <h2 className="font-semibold text-slate-100 mb-2 flex items-center gap-2">
              <Lightbulb size={16} className="text-ok" /> What we know
            </h2>
            <textarea
              className="input min-h-[140px] resize-y"
              placeholder="Facts, identifiers, leads you start with…"
              value={known}
              onChange={(e) => {
                setKnown(e.target.value)
                patchProject({ known: e.target.value })
              }}
            />
          </div>
          <div className="card p-4">
            <h2 className="font-semibold text-slate-100 mb-2 flex items-center gap-2">
              <Target size={16} className="text-brand-glow" /> What we’re trying to find
            </h2>
            <textarea
              className="input min-h-[140px] resize-y"
              placeholder="Objectives & open questions…"
              value={objectives}
              onChange={(e) => {
                setObjectives(e.target.value)
                patchProject({ objectives: e.target.value })
              }}
            />
          </div>
        </div>

        {/* Linked items */}
        <LinkSection
          title="Personas"
          icon={<Drama size={16} className="text-brand-glow" />}
          onNew={newPersona}
          attachOptions={unlinkedPersonas.map((p) => ({ id: p.id, label: `${p.name} (@${p.handle})` }))}
          onAttach={(pid) => {
            const p = allPersonas.find((x) => x.id === pid)
            if (p) linkPersona(p, true)
          }}
          empty="No personas linked. Create or attach a sock puppet for this investigation."
          items={contents.personas.map((p) => ({
            id: p.id,
            primary: p.name,
            secondary: `@${p.handle}`,
            icon: <Fingerprint size={15} style={{ color: personaColor(p.id) }} />,
            badge: <StatusBadge status={p.status} />,
            onOpen: () => openInBrowser(['https://duckduckgo.com/'], p.id),
            onUnlink: () => linkPersona(p, false)
          }))}
        />

        <LinkSection
          title="Notes"
          icon={<NotebookPen size={16} className="text-brand-glow" />}
          onNew={newNote}
          attachOptions={unlinkedNotes.map((n) => ({ id: n.id, label: n.title }))}
          onAttach={(nid) => {
            const n = allNotes.find((x) => x.id === nid)
            if (n) linkNote(n, true)
          }}
          empty="No notes linked yet."
          items={contents.notes.map((n) => ({
            id: n.id,
            primary: n.title,
            secondary: new Date(n.updatedAt).toLocaleDateString(),
            icon: <NotebookPen size={15} className="text-slate-400" />,
            onOpen: () => nav('/notes'),
            onUnlink: () => linkNote(n, false)
          }))}
        />

        <LinkSection
          title="Link charts"
          icon={<Workflow size={16} className="text-brand-glow" />}
          onNew={newBoard}
          attachOptions={unlinkedBoards.map((b) => ({ id: b.id, label: b.name }))}
          onAttach={(bid) => {
            const b = allBoards.find((x) => x.id === bid)
            if (b) linkBoard(b, true)
          }}
          empty="No link charts yet."
          items={contents.boards.map((b) => ({
            id: b.id,
            primary: b.name,
            secondary: new Date(b.updatedAt).toLocaleDateString(),
            icon: <Workflow size={15} className="text-slate-400" />,
            onOpen: () => nav('/graph'),
            onUnlink: () => linkBoard(b, false)
          }))}
        />
      </div>

      {editing && (
        <ProjectEditor
          initial={project}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            load()
          }}
        />
      )}

      <PivotModal
        open={pivotOpen}
        onClose={() => setPivotOpen(false)}
        subject={subjectForType[project.type]}
        value={project.subject}
      />
    </div>
  )
}

interface LinkItem {
  id: string
  primary: string
  secondary?: string
  icon: JSX.Element
  badge?: JSX.Element
  onOpen: () => void
  onUnlink: () => void
}

function LinkSection({
  title,
  icon,
  items,
  empty,
  onNew,
  attachOptions,
  onAttach
}: {
  title: string
  icon: JSX.Element
  items: LinkItem[]
  empty: string
  onNew: () => void
  attachOptions: { id: string; label: string }[]
  onAttach: (id: string) => void
}): JSX.Element {
  return (
    <section className="card">
      <header className="flex items-center justify-between px-4 py-3 border-b border-ink-700">
        <div className="font-semibold text-slate-100 text-sm flex items-center gap-2">
          {icon} {title} <span className="text-slate-500">({items.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {attachOptions.length > 0 && (
            <select
              className="input !w-auto py-1 text-xs"
              value=""
              onChange={(e) => e.target.value && onAttach(e.target.value)}
            >
              <option value="">＋ Attach existing…</option>
              {attachOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <button className="btn-primary !py-1 !px-2 text-xs" onClick={onNew}>
            <Plus size={14} /> New
          </button>
        </div>
      </header>
      {items.length === 0 ? (
        <div className="px-4 py-5 text-sm text-slate-500">{empty}</div>
      ) : (
        <div className="divide-y divide-ink-800">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-ink-800 group">
              <div className="w-8 h-8 rounded-lg bg-ink-800 border border-ink-700 flex items-center justify-center shrink-0">
                {it.icon}
              </div>
              <button className="min-w-0 flex-1 text-left" onClick={it.onOpen}>
                <div className="text-sm font-medium text-slate-200 truncate">{it.primary}</div>
                {it.secondary && <div className="text-xs text-slate-500 truncate">{it.secondary}</div>}
              </button>
              {it.badge}
              <button className="btn-ghost !px-2" onClick={it.onOpen} title="Open">
                <Globe size={15} />
              </button>
              <button className="btn-ghost !px-2 text-slate-500" onClick={it.onUnlink} title="Unlink">
                <Unlink size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
