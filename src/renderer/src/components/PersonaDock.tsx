import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fingerprint, X, ChevronRight, Copy, Check, Globe, ExternalLink } from 'lucide-react'
import { usePersonaDock } from '../lib/dock'
import { useOpenInBrowser } from '../lib/browserBus'
import { useSettings } from '../lib/settings'
import { identityFields, identityText } from '../lib/identity'
import { personaColor, PROJECT_TYPES } from '../lib/constants'
import { CopyField } from './CopyField'
import { Icon } from './ui'
import { api, type Project, type Evidence } from '../lib/api'

type PanelState = { top: number; left: number; width: number; height: number }

// Prevent Electron's -webkit-app-region:drag from swallowing events when the
// panel overlaps the title bar / topbar drag region.
const NO_DRAG = { WebkitAppRegion: 'no-drag' } as unknown as CSSProperties

/** Drag + resize behaviour shared by both dock panels. */
function useDockPanel(): {
  panelRef: React.RefObject<HTMLElement | null>
  panelState: PanelState | null
  onHeaderMouseDown: (e: React.MouseEvent) => void
  onLeftResizeMouseDown: (e: React.MouseEvent) => void
  onBottomResizeMouseDown: (e: React.MouseEvent) => void
} {
  const { settings } = useSettings()
  const panelRef = useRef<HTMLElement | null>(null)
  const [panelState, setPanelState] = useState<PanelState | null>(null)
  const dragRef = useRef<{ mx: number; my: number; bx: number; by: number } | null>(null)
  const resizeRef = useRef<{ mx: number; my: number; br: DOMRect } | null>(null)
  const lastHeaderDown = useRef(0)
  const minTopRef = useRef(36)

  // While any drag or resize is active, place a transparent full-window overlay
  // with -webkit-app-region:no-drag so the OS can't see the TitleBar/Topbar drag
  // zone regardless of where the cursor travels during the gesture.
  function beginDrag(): () => void {
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;inset:0;z-index:9998;-webkit-app-region:no-drag'
    document.body.appendChild(el)
    return () => el.remove()
  }

  const onHeaderMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    const now = Date.now()
    const gap = now - lastHeaderDown.current
    lastHeaderDown.current = now
    if (gap < 500) return
    minTopRef.current = settings.ghostMode ? 68 : 36
    const box = panelRef.current
    if (!box) return
    const br = box.getBoundingClientRect()
    const pinned = { top: br.top, left: br.left, width: br.width, height: br.height }
    setPanelState(pinned)
    dragRef.current = { mx: e.clientX, my: e.clientY, bx: pinned.left, by: pinned.top }
    const endDrag = beginDrag()
    const onMove = (ev: MouseEvent): void => {
      if (!dragRef.current) return
      setPanelState((prev) => {
        if (!prev) return prev
        const newLeft = Math.max(0, Math.min(window.innerWidth - 60, dragRef.current!.bx + ev.clientX - dragRef.current!.mx))
        const newTop = Math.max(minTopRef.current, Math.min(window.innerHeight - 60, dragRef.current!.by + ev.clientY - dragRef.current!.my))
        return { ...prev, left: newLeft, top: newTop }
      })
    }
    const onUp = (): void => {
      dragRef.current = null
      endDrag()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onLeftResizeMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const box = panelRef.current
    if (!box) return
    const br = box.getBoundingClientRect()
    setPanelState({ top: br.top, left: br.left, width: br.width, height: br.height })
    resizeRef.current = { mx: e.clientX, my: e.clientY, br }
    const endDrag = beginDrag()
    const onMove = (ev: MouseEvent): void => {
      if (!resizeRef.current) return
      const { br } = resizeRef.current
      const newWidth = Math.max(240, br.right - ev.clientX)
      setPanelState((prev) => (prev ? { ...prev, width: newWidth, left: br.right - newWidth } : prev))
    }
    const onUp = (): void => {
      resizeRef.current = null
      endDrag()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onBottomResizeMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const box = panelRef.current
    if (!box) return
    const br = box.getBoundingClientRect()
    setPanelState({ top: br.top, left: br.left, width: br.width, height: br.height })
    resizeRef.current = { mx: e.clientX, my: e.clientY, br }
    const endDrag = beginDrag()
    const onMove = (ev: MouseEvent): void => {
      if (!resizeRef.current) return
      const { br } = resizeRef.current
      setPanelState((prev) => (prev ? { ...prev, height: Math.max(200, ev.clientY - br.top) } : prev))
    }
    const onUp = (): void => {
      resizeRef.current = null
      endDrag()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return { panelRef, panelState, onHeaderMouseDown, onLeftResizeMouseDown, onBottomResizeMouseDown }
}

/** Collapsed right-edge tab shared by both docks. `offsetY` keeps the two tabs
 *  from overlapping. */
function DockTab({
  label,
  icon,
  offsetY,
  onClick
}: {
  label: string
  icon: JSX.Element
  offsetY: string
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={`Show ${label}`}
      className="fixed right-0 z-40 -translate-y-1/2 flex items-center gap-2 px-2 py-3 rounded-l-xl bg-ink-800 border border-r-0 border-ink-600 hover:bg-ink-700 shadow-xl"
      style={{ top: offsetY, writingMode: 'vertical-rl' }}
    >
      {icon}
      <span className="text-xs font-medium text-slate-200 truncate max-h-32">{label}</span>
    </button>
  )
}

/** Pinned-persona reference dock (right edge). */
export function PersonaDock(): JSX.Element | null {
  const { persona, personaOpen, projectOpen, setPersonaOpen, unpin } = usePersonaDock()
  const openInBrowser = useOpenInBrowser()
  const [copiedAll, setCopiedAll] = useState(false)
  const { panelRef, panelState, onHeaderMouseDown, onLeftResizeMouseDown, onBottomResizeMouseDown } = useDockPanel()

  if (!persona) return null

  if (!personaOpen) {
    return (
      <DockTab
        label={persona.name}
        offsetY="38%"
        icon={<Fingerprint size={16} style={{ color: personaColor(persona.id) }} />}
        onClick={() => setPersonaOpen(true)}
      />
    )
  }

  // If the investigation dock is also open (and not yet dragged), sit to the left of it.
  const right = projectOpen ? 'right-[21.5rem]' : 'right-3'
  const posClass = panelState ? 'fixed z-40' : `fixed ${right} top-12 bottom-3 z-40 w-80`
  const panelStyle: React.CSSProperties = panelState
    ? { top: panelState.top, left: panelState.left, width: panelState.width, height: panelState.height }
    : {}

  return (
    <aside
      ref={panelRef as React.Ref<HTMLElement>}
      className={`${posClass} flex flex-col card !bg-ink-850 shadow-2xl border-ink-600 animate-fade-up`}
      style={{ ...NO_DRAG, ...panelStyle }}
      onDoubleClick={(e) => e.preventDefault()}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-10 bottom-3 w-1.5 cursor-ew-resize hover:bg-white/10 z-10 transition-colors"
        onMouseDown={onLeftResizeMouseDown}
      />
      {/* Bottom resize handle */}
      <div
        className="absolute bottom-0 left-3 right-0 h-1.5 cursor-ns-resize hover:bg-white/10 z-10 transition-colors"
        onMouseDown={onBottomResizeMouseDown}
      />

      {/* Header — drag handle */}
      <div
        className="flex items-center gap-2.5 p-3 border-b border-ink-700 cursor-grab active:cursor-grabbing shrink-0 select-none"
        onMouseDown={onHeaderMouseDown}
        onDoubleClick={(e) => e.preventDefault()}
      >
        {persona.avatarPath ? (
          <img src={persona.avatarPath} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" style={{ border: `1px solid ${personaColor(persona.id)}66` }} />
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${personaColor(persona.id)}22`, border: `1px solid ${personaColor(persona.id)}66` }}>
            <Fingerprint size={17} style={{ color: personaColor(persona.id) }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-100 truncate">{persona.name}</div>
          <div className="text-xs text-slate-500 truncate">@{persona.handle}</div>
        </div>
        <button className="btn-ghost !p-1.5" title="Collapse" onClick={() => setPersonaOpen(false)}>
          <ChevronRight size={16} />
        </button>
        <button className="btn-ghost !p-1.5" title="Unpin" onClick={unpin}>
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-700 shrink-0">
        <button className="btn-ghost border border-ink-600 text-xs flex-1" onClick={() => openInBrowser(['https://duckduckgo.com/'], persona.id)}>
          <Globe size={13} /> Browse as
        </button>
        <button
          className="btn-ghost border border-ink-600 text-xs flex-1"
          onClick={async () => {
            await api.clipboard.writeText(identityText(persona))
            setCopiedAll(true)
            setTimeout(() => setCopiedAll(false), 1400)
          }}
        >
          {copiedAll ? <Check size={13} className="text-ok" /> : <Copy size={13} />} Copy all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Identity</div>
          <div className="space-y-1.5">
            {identityFields(persona).map((f) => (
              <CopyField key={f.label} label={f.label} value={f.value} />
            ))}
          </div>
        </div>
        {(persona.accounts ?? []).filter((a) => a.username || a.password).length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Account credentials</div>
            <div className="space-y-2.5">
              {(persona.accounts ?? [])
                .filter((a) => a.username || a.password)
                .map((a, i) => (
                  <div key={i} className="rounded-lg border border-ink-700 p-2 space-y-1.5">
                    <div className="text-xs font-medium text-slate-300">{a.platform}</div>
                    <CopyField label="Username" value={a.username} />
                    <CopyField label="Password" value={a.password} />
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-ink-700 text-[10px] text-slate-600 shrink-0">Click any field to copy.</div>
    </aside>
  )
}

/** Active-investigation reference dock (right edge, below the persona tab). */
export function InvestigationDock(): JSX.Element | null {
  const { projectOpen, setProjectOpen } = usePersonaDock()
  const { settings, update } = useSettings()
  const nav = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const { panelRef, panelState, onHeaderMouseDown, onLeftResizeMouseDown, onBottomResizeMouseDown } = useDockPanel()

  const [evidence, setEvidence] = useState<Evidence[]>([])
  const activeId = settings.activeProjectId ?? null
  useEffect(() => {
    if (!activeId) {
      setProject(null)
      setEvidence([])
      return
    }
    api.projects.get(activeId).then(setProject)
    api.evidence.list(activeId).then(setEvidence)
  }, [activeId, projectOpen])

  if (!project) return null
  const cfg = PROJECT_TYPES[project.type]

  if (!projectOpen) {
    return (
      <DockTab
        label={project.name}
        offsetY="62%"
        icon={<Icon name={cfg.icon} size={16} className="text-brand-glow" />}
        onClick={() => setProjectOpen(true)}
      />
    )
  }

  const posClass = panelState ? 'fixed z-40' : 'fixed right-3 top-12 bottom-3 z-40 w-80'
  const panelStyle: React.CSSProperties = panelState
    ? { top: panelState.top, left: panelState.left, width: panelState.width, height: panelState.height }
    : {}

  const points = project.dataPoints ?? []
  return (
    <aside
      ref={panelRef as React.Ref<HTMLElement>}
      className={`${posClass} flex flex-col card !bg-ink-850 shadow-2xl border-ink-600 animate-fade-up`}
      style={{ ...NO_DRAG, ...panelStyle }}
      onDoubleClick={(e) => e.preventDefault()}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-10 bottom-3 w-1.5 cursor-ew-resize hover:bg-white/10 z-10 transition-colors"
        onMouseDown={onLeftResizeMouseDown}
      />
      {/* Bottom resize handle */}
      <div
        className="absolute bottom-0 left-3 right-0 h-1.5 cursor-ns-resize hover:bg-white/10 z-10 transition-colors"
        onMouseDown={onBottomResizeMouseDown}
      />

      {/* Header — drag handle */}
      <div
        className="flex items-center gap-2.5 p-3 border-b border-ink-700 cursor-grab active:cursor-grabbing shrink-0 select-none"
        onMouseDown={onHeaderMouseDown}
        onDoubleClick={(e) => e.preventDefault()}
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cfg.color}22`, border: `1px solid ${cfg.color}66` }}>
          <Icon name={cfg.icon} size={17} style={{ color: cfg.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-100 truncate">{project.name}</div>
          <div className="text-xs text-slate-500 truncate">
            {cfg.label}
            {project.subject ? ` · ${project.subject}` : ''}
          </div>
        </div>
        <button className="btn-ghost !p-1.5" title="Collapse" onClick={() => setProjectOpen(false)}>
          <ChevronRight size={16} />
        </button>
        <button className="btn-ghost !p-1.5" title="Clear active investigation" onClick={() => update({ activeProjectId: null })}>
          <X size={16} />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-ink-700 shrink-0">
        <button className="btn-ghost border border-ink-600 text-xs w-full justify-center" onClick={() => nav(`/projects/${project.id}`)}>
          <ExternalLink size={13} /> Open investigation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {project.subject && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Subject</div>
            <CopyField label="Subject" value={project.subject} />
          </div>
        )}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
            Known information {points.length > 0 && <span className="text-slate-600">({points.length})</span>}
          </div>
          {points.length === 0 ? (
            <p className="text-xs text-slate-500">No data points yet — add them in the investigation.</p>
          ) : (
            <div className="space-y-1.5">
              {points.map((d) => (
                <CopyField key={d.id} label={d.note ? `${d.type} · ${d.note}` : d.type} value={d.value} />
              ))}
            </div>
          )}
        </div>
        {evidence.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Evidence <span className="text-slate-600">({evidence.length})</span>
            </div>
            <div className="space-y-1.5">
              {evidence.slice(0, 25).map((ev) => (
                <CopyField
                  key={ev.id}
                  label={ev.title ? ev.title.slice(0, 32) : ev.kind}
                  value={ev.sourceUrl || ev.title || ev.path}
                />
              ))}
              {evidence.length > 25 && (
                <p className="text-[10px] text-slate-600">+{evidence.length - 25} more — open investigation to see all.</p>
              )}
            </div>
          </div>
        )}
        {project.objectives && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Objectives</div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap">{project.objectives}</p>
          </div>
        )}
        {project.known && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Background</div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap">{project.known}</p>
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-ink-700 text-[10px] text-slate-600 shrink-0">Active investigation — captures & evidence file here.</div>
    </aside>
  )
}
