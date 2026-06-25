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
  Target,
  FileDown,
  Camera,
  ExternalLink,
  Loader2,
  ChevronDown,
  Star
} from 'lucide-react'
import {
  api,
  type Project,
  type Persona,
  type Note,
  type Board,
  type ProjectStatus,
  type DataPoint,
  type EntityType,
  type Evidence,
  type Activity
} from '../lib/api'
import { PROJECT_TYPES, ENTITY_TYPES, personaColor } from '../lib/constants'
import { Icon, StatusBadge } from '../components/ui'
import { ProjectEditor } from './Projects'
import { PivotModal } from '../components/PivotModal'
import { useOpenInBrowser } from '../lib/browserBus'
import { useConfirm } from '../lib/confirm'
import { useSettings } from '../lib/settings'
import { fmtDate, fmtDateTime } from '../lib/format'
import { subjectForEntity, type PivotSubject } from '../lib/pivot'

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
  const { settings, update } = useSettings()
  const [project, setProject] = useState<Project | null>(null)
  const [contents, setContents] = useState<{ personas: Persona[]; notes: Note[]; boards: Board[] }>({
    personas: [],
    notes: [],
    boards: []
  })
  const [allPersonas, setAllPersonas] = useState<Persona[]>([])
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const [allBoards, setAllBoards] = useState<Board[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [editing, setEditing] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)
  const [pivot, setPivot] = useState<{ value: string; subject: PivotSubject } | null>(null)
  const [known, setKnown] = useState('')
  const [objectives, setObjectives] = useState('')
  const [toast, setToast] = useState('')
  const [newType, setNewType] = useState<EntityType>('email')
  const [newValue, setNewValue] = useState('')
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const flash = (m: string): void => {
    setToast(m)
    setTimeout(() => setToast(''), 2600)
  }

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
    setEvidence(await api.evidence.list(id))
    setActivity(await api.activity.list(id))
  }

  const doExport = async (kind: 'pdf' | 'html' | 'md'): Promise<void> => {
    setReportOpen(false)
    setReportBusy(true)
    try {
      const path =
        kind === 'pdf'
          ? await api.projects.exportReportPdf(id)
          : kind === 'html'
            ? await api.projects.exportReportHtml(id)
            : await api.projects.exportReport(id)
      if (path) flash(`Report saved → ${path}`)
    } catch (e) {
      flash(`Export failed: ${String((e as Error)?.message ?? e)}`)
    } finally {
      setReportBusy(false)
    }
  }
  const removeEvidence = async (eid: string): Promise<void> => {
    await api.evidence.remove(eid)
    setEvidence((ev) => ev.filter((e) => e.id !== eid))
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
    if (settings.activeProjectId === project.id) update({ activeProjectId: null })
    window.dispatchEvent(new Event('gw:projects-changed'))
    nav('/projects')
  }

  // ---- data points ----
  const points = project?.dataPoints ?? []
  const addPoint = (): void => {
    if (!newValue.trim()) return
    patchProject({ dataPoints: [...points, { id: crypto.randomUUID(), type: newType, value: newValue.trim() }] })
    setNewValue('')
  }
  const removePoint = (pid: string): void => patchProject({ dataPoints: points.filter((d) => d.id !== pid) })

  const ensureBoard = async (): Promise<string> => {
    if (contents.boards[0]) return contents.boards[0].id
    const b = await api.boards.save({ name: `${project?.name ?? 'Investigation'} — link chart`, projectId: id })
    await load()
    return b.id
  }
  const addToGraph = async (type: EntityType, value: string): Promise<void> => {
    if (!value.trim()) return
    const boardId = await ensureBoard()
    await api.boards.saveNode({
      boardId,
      type,
      label: value.trim(),
      props: {},
      x: 80 + Math.round(Math.random() * 360),
      y: 80 + Math.round(Math.random() * 260)
    })
    await load()
    flash(`Added “${value}” to the link chart`)
  }
  const addAllToGraph = async (): Promise<void> => {
    if (points.length === 0) return
    const boardId = await ensureBoard()
    let i = 0
    for (const d of points) {
      if (!d.value.trim()) continue
      await api.boards.saveNode({
        boardId,
        type: d.type,
        label: d.value.trim(),
        props: d.note ? { note: d.note } : {},
        x: 120 + (i % 4) * 200,
        y: 120 + Math.floor(i / 4) * 110
      })
      i++
    }
    await load()
    nav(`/graph?board=${boardId}`)
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
            <button
              className="btn-primary"
              onClick={() => setPivot({ value: project.subject, subject: subjectForType[project.type] })}
            >
              <Crosshair size={15} /> Search target
            </button>
          )}
          <button
            className={`btn-ghost border border-ink-600 ${settings.activeProjectId === project.id ? '!text-amber-400 !border-amber-400/40' : ''}`}
            onClick={() => update({ activeProjectId: settings.activeProjectId === project.id ? null : project.id })}
            title={settings.activeProjectId === project.id ? 'Active investigation — click to clear' : 'Set as active investigation'}
          >
            <Star size={15} fill={settings.activeProjectId === project.id ? 'currentColor' : 'none'} />
            {settings.activeProjectId === project.id ? 'Active' : 'Set active'}
          </button>
          <div className="relative">
            <button
              className="btn-ghost border border-ink-600"
              onClick={() => setReportOpen((v) => !v)}
              disabled={reportBusy}
              title="Export a case report"
            >
              {reportBusy ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} Report
              <ChevronDown size={13} />
            </button>
            {reportOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setReportOpen(false)} />
                <div className="absolute right-0 mt-1 z-40 w-52 card py-1 shadow-2xl">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-slate-600">Export report</div>
                  <button className="w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-ink-700" onClick={() => doExport('pdf')}>
                    PDF — graph, evidence, timeline
                  </button>
                  <button className="w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-ink-700" onClick={() => doExport('html')}>
                    HTML (self-contained)
                  </button>
                  <button className="w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-ink-700" onClick={() => doExport('md')}>
                    Markdown (for Obsidian)
                  </button>
                </div>
              </>
            )}
          </div>
          <button className="btn-ghost !px-2" onClick={() => setEditing(true)} title="Edit details">
            <Pencil size={17} />
          </button>
          <button className="btn-danger !px-2" onClick={remove} title="Delete investigation">
            <Trash2 size={17} />
          </button>
        </div>

        {/* Known information — structured data points */}
        <section className="card">
          <header className="flex items-center justify-between px-4 py-3 border-b border-ink-700">
            <div className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              <Icon name="ListChecks" size={16} className="text-brand-glow" /> Known information
              <span className="text-slate-500">({points.length})</span>
            </div>
            <button className="btn-primary !py-1 !px-2 text-xs" disabled={points.length === 0} onClick={addAllToGraph}>
              <Workflow size={14} /> Build link chart
            </button>
          </header>

          <div className="divide-y divide-ink-800">
            {points.map((d) => {
              const ecfg = ENTITY_TYPES[d.type]
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 group">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${ecfg.color}22` }}
                  >
                    <Icon name={ecfg.icon} size={15} style={{ color: ecfg.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-200 truncate">{d.value}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {ecfg.label}
                      {d.note ? ` · ${d.note}` : ''}
                    </div>
                  </div>
                  <button
                    className="btn-ghost !px-2 text-xs"
                    title="Pivot — search this everywhere"
                    onClick={() => setPivot({ value: d.value, subject: subjectForEntity(d.type) })}
                  >
                    <Crosshair size={14} /> Pivot
                  </button>
                  <button
                    className="btn-ghost !px-2 text-xs"
                    title="Add to the link chart"
                    onClick={() => addToGraph(d.type, d.value)}
                  >
                    <Plus size={14} /> Graph
                  </button>
                  <button className="btn-ghost !px-2 text-slate-500" title="Remove" onClick={() => removePoint(d.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
            {points.length === 0 && (
              <div className="px-4 py-4 text-sm text-slate-500">
                No data points yet. Add what you know below — then pivot on it or drop it onto the link chart.
              </div>
            )}
          </div>

          {/* Add a data point */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-ink-700">
            <select
              className="input !w-40 py-1.5 text-sm"
              value={newType}
              onChange={(e) => setNewType(e.target.value as EntityType)}
            >
              {Object.entries(ENTITY_TYPES).map(([t, c]) => (
                <option key={t} value={t}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              className="input py-1.5 text-sm"
              placeholder="value (email, username, domain, IP…)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPoint()}
            />
            <button className="btn-primary shrink-0" disabled={!newValue.trim()} onClick={addPoint}>
              <Plus size={15} /> Add
            </button>
          </div>
        </section>

        {/* Known / Objectives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <h2 className="font-semibold text-slate-100 mb-2 flex items-center gap-2">
              <Lightbulb size={16} className="text-ok" /> Notes & context
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

        {/* Evidence */}
        <section className="card">
          <header className="flex items-center justify-between px-4 py-3 border-b border-ink-700">
            <div className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              <Camera size={16} className="text-brand-glow" /> Evidence <span className="text-slate-500">({evidence.length})</span>
            </div>
            <span className="text-[11px] text-slate-500">Capture from the Browser with this set as the active investigation</span>
          </header>
          {evidence.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500">
              No evidence yet. In the Browser, set this as the active investigation (top bar) and hit the camera button.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
              {evidence.map((e) => (
                <div key={e.id} className="card overflow-hidden group relative">
                  <img src={e.path} alt={e.title || 'evidence'} className="w-full h-32 object-cover object-top bg-ink-950" />
                  <div className="p-2.5">
                    <div className="text-xs font-medium text-slate-200 truncate">{e.title || e.sourceUrl || 'Capture'}</div>
                    <div className="text-[11px] text-slate-500 truncate">{fmtDateTime(e.capturedAt)}</div>
                    <div className="text-[10px] text-slate-600 font-mono truncate" title={e.sha256}>
                      sha256 {e.sha256.slice(0, 16)}…
                    </div>
                  </div>
                  <div className="absolute top-1.5 right-1.5 hidden group-hover:flex gap-1">
                    {e.sourceUrl && (
                      <button className="btn-ghost !p-1 bg-ink-900/80" onClick={() => api.shell.openExternal(e.sourceUrl!)} title="Open source URL">
                        <ExternalLink size={13} />
                      </button>
                    )}
                    <button className="btn-danger !p-1 bg-ink-900/80" onClick={() => removeEvidence(e.id)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

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
            secondary: fmtDate(n.updatedAt),
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
            secondary: fmtDate(b.updatedAt),
            icon: <Workflow size={15} className="text-slate-400" />,
            onOpen: () => nav('/graph'),
            onUnlink: () => linkBoard(b, false)
          }))}
        />

        {/* Activity log — methodology trail */}
        <section className="card">
          <header className="flex items-center gap-2 px-4 py-3 border-b border-ink-700">
            <Icon name="History" size={16} className="text-brand-glow" />
            <span className="font-semibold text-slate-100 text-sm">Activity</span>
            <span className="text-slate-500 text-sm">({activity.length})</span>
          </header>
          {activity.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500">
              Transforms, captures and report exports for this investigation will be logged here.
            </div>
          ) : (
            <div className="divide-y divide-ink-800 max-h-72 overflow-y-auto">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 w-16 shrink-0">{a.type}</span>
                  <span className="text-sm text-slate-300 flex-1 min-w-0 truncate">{a.message}</span>
                  <span className="text-xs text-slate-600 shrink-0">{fmtDateTime(a.at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
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
        open={!!pivot}
        onClose={() => setPivot(null)}
        subject={pivot?.subject ?? subjectForType[project.type]}
        value={pivot?.value ?? project.subject}
      />

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 card px-4 py-2.5 text-sm text-slate-200 border-brand/30 shadow-xl">
          {toast}
        </div>
      )}
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
