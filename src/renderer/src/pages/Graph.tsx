import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  getNodesBounds,
  getViewportForBounds,
  SelectionMode,
  type Node,
  type Edge,
  type Connection,
  type NodeProps
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng } from 'html-to-image'
import { Plus, Trash2, X, ImagePlus, Crosshair, Sparkles, Loader2, ImageDown, Check, AlertTriangle, KeyRound, Minus, ChevronDown, ChevronUp, Globe, BoxSelect, Hand, Search, LayoutGrid, Combine, Link2 } from 'lucide-react'
import { api, type Board, type EntityNode, type EntityType, type Evidence, type Project } from '../lib/api'
import { autoLink } from '../lib/graphlink'
import { ENTITY_TYPES } from '../lib/constants'
import { Icon, EmptyState, Modal } from '../components/ui'
import { PivotModal } from '../components/PivotModal'
import { RequireCase } from '../components/RequireCase'
import { subjectForEntity, type PivotSubject } from '../lib/pivot'
import { transformsFor, type Transform, type TransformOutput } from '../lib/transforms'
import { useOpenInBrowser } from '../lib/browserBus'
import { useSettings } from '../lib/settings'
import { useConfirm } from '../lib/confirm'
import { addLog } from '../lib/debugLog'

type RFNode = Node<{ entity: EntityNode }>

/** A record of one transform execution, shown live in the run log. */
interface TransformRun {
  id: string
  label: string
  target: string
  targetType: EntityType
  status: 'running' | 'done' | 'empty' | 'skipped' | 'error'
  summary?: string
  added?: number
  error?: string
  at: number
}

// ---------- Custom entity node ----------
function EntityNodeView({ data, selected }: NodeProps<RFNode>): JSX.Element {
  const e = data.entity
  const cfg = ENTITY_TYPES[e.type]
  return (
    <div
      className="rounded-xl px-3 py-2 min-w-[150px] bg-ink-850 border-2 shadow-lg transition-all"
      style={{
        borderColor: selected ? cfg.color : cfg.ring,
        boxShadow: selected ? `0 0 0 3px ${cfg.ring}` : undefined
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: cfg.color }} />
      <div className="flex items-center gap-2">
        {e.props.image ? (
          <img src={e.props.image} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${cfg.color}22` }}
          >
            <Icon name={cfg.icon} size={16} className="text-slate-100" />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide" style={{ color: cfg.color }}>
            {cfg.label}
          </div>
          <div className="text-sm font-medium text-slate-100 truncate max-w-[160px]">
            {e.label || 'Unlabeled'}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: cfg.color }} />
    </div>
  )
}

const nodeTypes = { entity: EntityNodeView }

/** Best openable URL for an entity: an explicit url/source prop, a domain, a
 *  social/profile link, or a maps link for a location. Null if nothing to open. */
function entityUrl(e: EntityNode): string | null {
  const p = e.props ?? {}
  if (p.url && /^https?:\/\//i.test(p.url)) return p.url
  if (p.source && /^https?:\/\//i.test(p.source)) return p.source
  const label = (e.label ?? '').trim()
  if (!label) return null
  if (e.type === 'domain') return `https://${label.replace(/^https?:\/\//i, '').replace(/\/.*$/, '')}`
  if (e.type === 'location') {
    if (p.lat && p.lng) return `https://www.google.com/maps?q=${p.lat},${p.lng}`
    return `https://www.google.com/maps/search/${encodeURIComponent(label)}`
  }
  if (e.type === 'email') return `https://www.google.com/search?q=${encodeURIComponent('"' + label + '"')}`
  return null
}

export function Graph(): JSX.Element {
  return (
    <ReactFlowProvider>
      <GraphInner />
    </ReactFlowProvider>
  )
}

function GraphInner(): JSX.Element {
  const [boards, setBoards] = useState<Board[]>([])
  const [boardId, setBoardId] = useState<string>('')
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selected, setSelected] = useState<EntityNode | null>(null)
  const [pivot, setPivot] = useState<{ value: string; subject: PivotSubject } | null>(null)
  const [creatingBoard, setCreatingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardProject, setNewBoardProject] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [toast, setToast] = useState('')
  const [busyTransform, setBusyTransform] = useState<string | null>(null)
  const [runs, setRuns] = useState<TransformRun[]>([])
  const [logOpen, setLogOpen] = useState(true)
  const [menu, setMenu] = useState<{ x: number; y: number; entity: EntityNode } | null>(null)
  const [imgPicker, setImgPicker] = useState(false)
  const [pickEvidence, setPickEvidence] = useState<Evidence[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const nav = useNavigate()
  const seq = useRef(0)
  const openInBrowser = useOpenInBrowser()
  const { settings } = useSettings()
  const confirm = useConfirm()

  const [params] = useSearchParams()

  // Boards visible in the dropdown — only those belonging to the active investigation.
  const activeBoards = boards.filter((b) => b.projectId === (settings.activeProjectId ?? null))
  const board = activeBoards.find((b) => b.id === boardId)
  const flash = (m: string): void => {
    setToast(m)
    setTimeout(() => setToast(''), 2600)
  }

  // Reload boards whenever the active investigation changes. Always pick the
  // first board for the new investigation (or clear if there are none) so stale
  // boards from other investigations never bleed through.
  useEffect(() => {
    let cancelled = false
    api.boards.list().then((list) => {
      if (cancelled) return
      setBoards(list)
      if (!params.get('board')) {
        const activeId = settings.activeProjectId ?? null
        const match = activeId ? list.find((b) => b.projectId === activeId) : null
        setBoardId(match?.id ?? '')
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.activeProjectId])

  // Honor ?board=<id> (e.g. opened from an investigation's "Build link chart").
  useEffect(() => {
    const b = params.get('board')
    if (b) setBoardId(b)
  }, [params])

  const loadGraph = useCallback(async (id: string): Promise<void> => {
    const { nodes: ents, edges: eds } = await api.boards.graph(id)
    setNodes(
      ents.map((e) => ({
        id: e.id,
        type: 'entity',
        position: { x: e.x, y: e.y },
        data: { entity: e }
      }))
    )
    setEdges(
      eds.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: true,
        style: { stroke: '#3a4456' }
      }))
    )
  }, [setNodes, setEdges])

  useEffect(() => {
    if (boardId) loadGraph(boardId)
  }, [boardId, loadGraph])

  const openCreateBoard = (): void => {
    const activeId = settings.activeProjectId ?? ''
    setNewBoardProject(activeId)
    setNewBoardName('New board')
    api.projects.list().then((list) => {
      setProjects(list)
      if (activeId) {
        const p = list.find((pr) => pr.id === activeId)
        if (p) setNewBoardName(`${p.name} — link chart`)
      }
    })
    setCreatingBoard(true)
  }

  const createBoard = async (): Promise<void> => {
    const name = newBoardName.trim()
    if (!name) return
    const b = await api.boards.save({ name, projectId: newBoardProject || null })
    setCreatingBoard(false)
    const list = await api.boards.list()
    setBoards(list)
    setBoardId(b.id)
  }

  const deleteBoard = async (): Promise<void> => {
    if (!board) return
    if (!(await confirm({ title: `Delete board “${board.name}”?`, message: 'This deletes the board and all its entities and links.', confirmText: 'Delete', danger: true }))) return
    await api.boards.remove(board.id)
    setBoardId('')
    setSelected(null)
    api.boards.list().then(setBoards)
  }

  const addEntity = async (type: EntityType): Promise<void> => {
    if (!boardId) return
    seq.current += 1
    const offset = seq.current * 30
    const saved = await api.boards.saveNode({
      boardId,
      type,
      label: '',
      props: {},
      x: 120 + (offset % 300),
      y: 120 + (offset % 240)
    })
    setNodes((nds) => [
      ...nds,
      { id: saved.id, type: 'entity', position: { x: saved.x, y: saved.y }, data: { entity: saved } }
    ])
    setSelected(saved)
  }

  const onConnect = useCallback(
    async (conn: Connection): Promise<void> => {
      if (!conn.source || !conn.target || !boardId) return
      const e = await api.boards.saveEdge({ boardId, source: conn.source, target: conn.target })
      setEdges((eds) => addEdge({ id: e.id, ...conn, animated: true, style: { stroke: '#3a4456' } }, eds))
    },
    [boardId, setEdges]
  )

  const onNodeDragStop = useCallback((_: unknown, node: Node, dragged: Node[]): void => {
    // When several nodes are selected they move together — persist them all.
    const list = dragged && dragged.length ? dragged : [node]
    for (const n of list) {
      const entity = (n.data as { entity: EntityNode }).entity
      api.boards.saveNode({ ...entity, x: n.position.x, y: n.position.y })
    }
  }, [])

  // Persist edge/node deletions made via keyboard (select + Delete/Backspace).
  const onEdgesDelete = useCallback((eds: Edge[]): void => {
    eds.forEach((e) => api.boards.removeEdge(e.id))
  }, [])
  const onNodesDelete = useCallback((nds: Node[]): void => {
    nds.forEach((n) => api.boards.removeNode(n.id))
    setSelected((s) => (s && nds.some((n) => n.id === s.id) ? null : s))
  }, [])

  // Double-click a link to remove it.
  const removeEdge = (edgeId: string): void => {
    api.boards.removeEdge(edgeId)
    setEdges((eds) => eds.filter((e) => e.id !== edgeId))
    flash('Link removed')
  }
  const onEdgeDoubleClick = useCallback((_: unknown, edge: Edge): void => {
    removeEdge(edge.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEdges])

  // Tidy the board: group nodes into columns by type and persist positions.
  const tidyLayout = (): void => {
    const byType = new Map<string, RFNode[]>()
    for (const n of nodes) {
      const t = (n.data as { entity: EntityNode }).entity.type
      if (!byType.has(t)) byType.set(t, [])
      byType.get(t)!.push(n)
    }
    const COLW = 240
    const ROWH = 92
    let col = 0
    const updates: { id: string; x: number; y: number }[] = []
    for (const [, group] of byType) {
      group.forEach((n, i) => updates.push({ id: n.id, x: 80 + col * COLW, y: 80 + i * ROWH }))
      col++
    }
    const posById = new Map(updates.map((u) => [u.id, u]))
    setNodes((nds) =>
      nds.map((n) => {
        const u = posById.get(n.id)
        return u ? { ...n, position: { x: u.x, y: u.y } } : n
      })
    )
    for (const u of updates) {
      const ent = (nodes.find((n) => n.id === u.id)!.data as { entity: EntityNode }).entity
      api.boards.saveNode({ ...ent, x: u.x, y: u.y })
    }
    flash('Tidied layout')
  }

  // Merge entities that share the same type + label: keep one, rewire edges.
  const mergeDuplicates = async (): Promise<void> => {
    const keep = new Map<string, string>() // type:label -> kept nodeId
    const remap = new Map<string, string>() // dupId -> keptId
    for (const n of nodes) {
      const e = (n.data as { entity: EntityNode }).entity
      const key = `${e.type}:${e.label.trim().toLowerCase()}`
      if (!e.label.trim()) continue
      if (keep.has(key)) remap.set(n.id, keep.get(key)!)
      else keep.set(key, n.id)
    }
    if (remap.size === 0) {
      flash('No duplicate entities found')
      return
    }
    const edgeKeys = new Set<string>()
    for (const e of edges) edgeKeys.add(`${e.source}->${e.target}`)
    // Rewire edges off duplicates onto the kept node.
    for (const e of edges) {
      const src = remap.get(e.source) ?? e.source
      const tgt = remap.get(e.target) ?? e.target
      if (src === e.source && tgt === e.target) continue
      await api.boards.removeEdge(e.id)
      if (src !== tgt && !edgeKeys.has(`${src}->${tgt}`)) {
        await api.boards.saveEdge({ boardId, source: src, target: tgt, label: e.label as string })
        edgeKeys.add(`${src}->${tgt}`)
      }
    }
    for (const dupId of remap.keys()) await api.boards.removeNode(dupId)
    await loadGraph(boardId)
    setSelected(null)
    flash(`Merged ${remap.size} duplicate${remap.size === 1 ? '' : 's'}`)
  }

  // Maltego-style: connect related entities already on the board.
  const runAutoLink = async (): Promise<void> => {
    if (!boardId) return
    const n = await autoLink(boardId)
    await loadGraph(boardId)
    flash(n > 0 ? `Linked ${n} related entit${n === 1 ? 'y' : 'ies'}` : 'No new links found')
  }

  const onNodeClick = useCallback((_: unknown, node: Node): void => {
    setSelected((node.data as { entity: EntityNode }).entity)
    setMenu(null)
  }, [])

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node): void => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, entity: (node.data as { entity: EntityNode }).entity })
  }, [])

  // Dim non-matching nodes while searching the board.
  const viewNodes = useMemo(() => {
    const s = findQuery.trim().toLowerCase()
    if (!s) return nodes
    return nodes.map((n) => {
      const e = (n.data as { entity: EntityNode }).entity
      const hay = `${e.label} ${e.type} ${Object.values(e.props ?? {}).join(' ')}`.toLowerCase()
      return { ...n, style: { ...(n.style ?? {}), opacity: hay.includes(s) ? 1 : 0.18 } }
    })
  }, [nodes, findQuery])

  const openImagePicker = (): void => {
    const pid = board?.projectId ?? null
    api.evidence.list(pid).then((list) => setPickEvidence(list.filter((e) => e.kind !== 'file')))
    setImgPicker(true)
  }
  const chooseEvidenceImage = (ev: Evidence): void => {
    if (selected) updateSelected({ props: { ...(selected.props ?? {}), image: ev.path } })
    setImgPicker(false)
  }
  const uploadEntityImage = async (): Promise<void> => {
    if (!selected) return
    const url = await api.files.pickImage('entity')
    if (url) updateSelected({ props: { ...(selected.props ?? {}), image: url } })
  }
  const clearEntityImage = (): void => {
    if (!selected) return
    const next = { ...(selected.props ?? {}) }
    delete next.image
    updateSelected({ props: next })
  }

  const openLink = (entity: EntityNode): void => {
    const url = entityUrl(entity)
    if (!url) {
      flash('No link on this entity — run a transform or add a “url” property.')
      return
    }
    openInBrowser([url])
  }

  // Double-clicking a node opens its link in the in-app browser.
  const onNodeDoubleClick = useCallback((_: unknown, node: Node): void => {
    openLink((node.data as { entity: EntityNode }).entity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openInBrowser])

  const updateSelected = (patch: Partial<EntityNode>): void => {
    if (!selected) return
    const updated = { ...selected, ...patch }
    setSelected(updated)
    setNodes((nds) =>
      nds.map((n) => (n.id === updated.id ? { ...n, data: { entity: updated } } : n))
    )
    api.boards.saveNode(updated)
  }

  const deleteSelected = async (): Promise<void> => {
    if (!selected) return
    await api.boards.removeNode(selected.id)
    setNodes((nds) => nds.filter((n) => n.id !== selected.id))
    setEdges((eds) => eds.filter((e) => e.source !== selected.id && e.target !== selected.id))
    setSelected(null)
  }

  // Snapshot of what's on the board, so a batch of transforms dedupes correctly
  // even before React state catches up between awaits.
  const buildDedupe = (): { existing: Map<string, string>; edgeKeys: Set<string>; count: number } => {
    const existing = new Map<string, string>() // type:label -> nodeId
    for (const n of nodes) {
      const e = (n.data as { entity: EntityNode }).entity
      existing.set(`${e.type}:${e.label.trim().toLowerCase()}`, n.id)
    }
    const edgeKeys = new Set(edges.map((e) => `${e.source}->${e.target}`))
    return { existing, edgeKeys, count: nodes.length }
  }

  // Apply one transform's output to the graph, mutating the shared dedupe maps.
  const applyOutput = async (
    entity: EntityNode,
    t: Transform,
    out: TransformOutput,
    existing: Map<string, string>,
    edgeKeys: Set<string>,
    spread: { i: number }
  ): Promise<number> => {
    const fresh = out.entities.filter((ne) => ne.label.trim())
    let added = 0
    for (const ne of fresh) {
      const key = `${ne.type}:${ne.label.trim().toLowerCase()}`
      let targetId = existing.get(key)
      if (!targetId) {
        const saved = await api.boards.saveNode({
          boardId,
          type: ne.type,
          label: ne.label.trim(),
          props: ne.props ?? {},
          x: entity.x + 260 + Math.floor(spread.i / 12) * 220,
          y: entity.y + ((spread.i % 12) - 5.5) * 80
        })
        setNodes((nds) => [
          ...nds,
          { id: saved.id, type: 'entity', position: { x: saved.x, y: saved.y }, data: { entity: saved } }
        ])
        existing.set(key, saved.id)
        targetId = saved.id
        added++
        spread.i++
      }
      if (targetId !== entity.id && !edgeKeys.has(`${entity.id}->${targetId}`)) {
        const edge = await api.boards.saveEdge({ boardId, source: entity.id, target: targetId, label: t.label })
        edgeKeys.add(`${entity.id}->${targetId}`)
        setEdges((eds) =>
          addEdge({ id: edge.id, source: entity.id, target: targetId!, animated: true, style: { stroke: '#3a4456' } }, eds)
        )
      }
    }
    if (out.updateSource && Object.keys(out.updateSource).length) {
      const updated = { ...entity, props: { ...(entity.props ?? {}), ...out.updateSource } }
      setNodes((nds) => nds.map((n) => (n.id === entity.id ? { ...n, data: { entity: updated } } : n)))
      if (selected?.id === entity.id) setSelected(updated)
      api.boards.saveNode(updated)
    }
    return added
  }

  const pushRun = (r: Omit<TransformRun, 'id' | 'at'>): string => {
    const id = `run_${Date.now()}_${seq.current++}`
    setRuns((prev) => [{ ...r, id, at: Date.now() }, ...prev].slice(0, 60))
    setLogOpen(true)
    return id
  }
  const patchRun = (id: string, patch: Partial<TransformRun>): void =>
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  // Run one transform, recording its lifecycle in the log. Returns nodes added.
  const executeOne = async (
    entity: EntityNode,
    t: Transform,
    existing: Map<string, string>,
    edgeKeys: Set<string>,
    spread: { i: number }
  ): Promise<number> => {
    const runId = pushRun({ label: t.label, target: entity.label, targetType: entity.type, status: 'running' })
    const keys = settings.apiKeys ?? {}
    if (t.needsKey && !keys[t.needsKey]) {
      patchRun(runId, { status: 'skipped', summary: `Needs a ${t.needsKey} API key (Settings)` })
      return 0
    }
    try {
      const out = await t.run(entity.label, entity.props ?? {}, { apiKeys: keys })
      const added = await applyOutput(entity, t, out, existing, edgeKeys, spread)
      const dupes = out.entities.filter((e) => e.label.trim()).length - added
      patchRun(runId, {
        status: added > 0 || out.updateSource ? 'done' : 'empty',
        added,
        summary: out.note ? `${out.note}${dupes > 0 ? ` · ${dupes} already on board` : ''}` : `${added} node(s) added`
      })
      if (board?.projectId) {
        api.activity.log(board.projectId, 'transform', `${t.label} on “${entity.label}”${added > 0 ? ` → +${added} node(s)` : ''}`)
      }
      return added
    } catch (e) {
      // Strip the Electron IPC wrapper ("Error invoking remote method '...': Error: ")
      // so the transform log shows just the meaningful part, e.g. "HTTP 401 — Invalid key".
      const raw = String((e as Error)?.message ?? e)
      const msg = raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
      patchRun(runId, { status: 'error', error: msg })
      addLog('error', t.label, `${entity.label}: ${msg}`)
      return 0
    }
  }

  const runTransform = async (entity: EntityNode, t: Transform): Promise<void> => {
    setBusyTransform(t.id)
    try {
      const { existing, edgeKeys } = buildDedupe()
      await executeOne(entity, t, existing, edgeKeys, { i: 0 })
    } finally {
      setBusyTransform(null)
    }
  }

  // Maltego-style "run all": runs every applicable transform on a node and pulls
  // all results into the graph at once. Skips ones whose API key isn't set.
  const runAllTransforms = async (entity: EntityNode): Promise<void> => {
    const keys = settings.apiKeys ?? {}
    const ts = transformsFor(entity.type).filter((t) => !t.needsKey || keys[t.needsKey])
    if (ts.length === 0) {
      flash('No transforms available for this entity (add API keys to unlock more).')
      return
    }
    setBusyTransform('__all__')
    const { existing, edgeKeys } = buildDedupe()
    const spread = { i: 0 }
    try {
      let total = 0
      for (const t of ts) total += await executeOne(entity, t, existing, edgeKeys, spread)
      flash(`Ran ${ts.length} transform${ts.length === 1 ? '' : 's'} → +${total} node(s)`)
    } finally {
      setBusyTransform(null)
    }
  }

  const addEntityToNotes = async (entity: EntityNode): Promise<void> => {
    const title = `${board?.name ?? 'Link chart'} — findings`
    const pid = board?.projectId ?? null
    const cfg = ENTITY_TYPES[entity.type]
    const propLines = Object.entries(entity.props ?? {})
      .filter(([k]) => k !== 'image')
      .map(([k, v]) => `  - ${k}: ${v}`)
      .join('\n')
    const line = `- **${cfg.label}:** ${entity.label}${entity.notes ? ` — ${entity.notes}` : ''}${propLines ? `\n${propLines}` : ''}`
    const list = await api.notes.list()
    const existing = list.find((n) => n.title === title && (n.projectId ?? null) === pid)
    if (existing) {
      await api.notes.save({ ...existing, body: `${existing.body}\n${line}` })
    } else {
      await api.notes.save({ title, body: `# ${title}\n\n${line}`, folder: 'Investigations', projectId: pid })
    }
    flash('Added to investigation notes')
  }

  const exportPng = async (): Promise<void> => {
    if (nodes.length === 0) {
      flash('Nothing to export — add some entities first')
      return
    }
    const w = 1600
    const h = 1000
    const bounds = getNodesBounds(nodes)
    const vp = getViewportForBounds(bounds, w, h, 0.4, 2, 0.15)
    const el = document.querySelector('.react-flow__viewport') as HTMLElement | null
    if (!el) return
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: '#0b0e15',
        width: w,
        height: h,
        style: { width: `${w}px`, height: `${h}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` }
      })
      const name = `${(board?.name ?? 'graph').replace(/[^a-z0-9_-]+/gi, '-')}.png`
      const path = await api.files.exportImage(dataUrl, name)
      if (path) flash(`Saved ${path}`)
    } catch (e) {
      flash(`Export failed: ${String((e as Error)?.message ?? e)}`)
    }
  }

  const entityTypeList = useMemo(() => Object.entries(ENTITY_TYPES) as [EntityType, typeof ENTITY_TYPES[EntityType]][], [])

  const boardModal = (
    <Modal open={creatingBoard} onClose={() => setCreatingBoard(false)} title="New investigation board">
      <div className="space-y-4">
        <div>
          <label className="label">Board name</label>
          <input
            className="input"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createBoard()}
            autoFocus
          />
        </div>
        <div>
          <label className="label">Investigation <span className="text-red-400">*</span></label>
          <select className="input" value={newBoardProject} onChange={(e) => setNewBoardProject(e.target.value)} required>
            <option value="" disabled>Select an investigation…</option>
            {projects.filter((pr) => !pr.archived).map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.name}
              </option>
            ))}
          </select>
          {projects.filter((pr) => !pr.archived).length === 0 && (
            <p className="text-xs text-slate-500 mt-1">No active investigations — <a className="text-brand-glow underline cursor-pointer" onClick={() => { setCreatingBoard(false); nav("/projects") }}>create one first</a>.</p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={() => setCreatingBoard(false)}>
          Cancel
        </button>
        <button className="btn-primary" onClick={createBoard} disabled={!newBoardName.trim() || !newBoardProject}>
          Create board
        </button>
      </div>
    </Modal>
  )

  if (activeBoards.length === 0) {
    return (
      <>
        <EmptyState
          icon="Workflow"
          title="No boards for this investigation"
          subtitle="Create a board to map out entities — people, emails, usernames, domains — and the links between them."
          action={
            <button className="btn-primary" onClick={openCreateBoard}>
              <Plus size={16} /> New board
            </button>
          }
        />
        {boardModal}
      </>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Board bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-ink-700">
        <Icon name="Workflow" size={18} className="text-brand-glow" />
        <select
          className="input !w-auto py-1.5"
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
        >
          {activeBoards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button className="btn-ghost" onClick={openCreateBoard}>
          <Plus size={15} /> New board
        </button>
        {board && (
          <button className="btn-ghost" onClick={exportPng} title="Export the chart as a PNG">
            <ImageDown size={15} /> Export PNG
          </button>
        )}
        {board && nodes.length > 0 && (
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="input !w-44 pl-8 !py-1.5 text-sm"
              placeholder="Find on chart…"
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
            />
          </div>
        )}
        {board && (
          <button
            className={`btn-ghost ${selectMode ? '!text-brand-glow !border-brand/50 border' : ''}`}
            onClick={() => setSelectMode((v) => !v)}
            title={selectMode ? 'Select mode: drag a box to select nodes (click to pan off)' : 'Switch to box-select mode'}
          >
            {selectMode ? <BoxSelect size={15} /> : <Hand size={15} />} {selectMode ? 'Select' : 'Pan'}
          </button>
        )}
        {board && nodes.length > 1 && (
          <>
            <button className="btn-ghost" onClick={tidyLayout} title="Auto-arrange nodes by type">
              <LayoutGrid size={15} /> Tidy
            </button>
            <button className="btn-ghost" onClick={mergeDuplicates} title="Merge entities with the same type & label">
              <Combine size={15} /> Merge dupes
            </button>
            <button className="btn-ghost" onClick={runAutoLink} title="Auto-link related entities (email↔domain, subdomain↔domain, email↔username)">
              <Link2 size={15} /> Auto-link
            </button>
          </>
        )}
        {board && (
          <button className="btn-danger" onClick={deleteBoard}>
            <Trash2 size={15} /> Delete board
          </button>
        )}
        <div className="ml-auto text-xs text-slate-500">
          {nodes.length} entities · {edges.length} links · {selectMode ? 'drag a box to select · ' : ''}shift-click for multi-select · Del removes
        </div>
      </div>

      {/* Entity palette */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-ink-700 overflow-x-auto">
        <span className="text-xs text-slate-500 mr-1">Add:</span>
        {entityTypeList.map(([type, cfg]) => (
          <button
            key={type}
            onClick={() => addEntity(type)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-ink-700 hover:border-ink-500 hover:bg-ink-800 whitespace-nowrap"
            style={{ color: cfg.color }}
          >
            <Icon name={cfg.icon} size={13} />
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Canvas + inspector */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 relative">
          <ReactFlow
            nodes={viewNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onEdgesDelete={onEdgesDelete}
            onNodesDelete={onNodesDelete}
            edgesFocusable
            deleteKeyCode={['Delete', 'Backspace']}
            multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
            selectionKeyCode="Shift"
            selectionOnDrag={selectMode}
            panOnDrag={selectMode ? [1, 2] : true}
            selectionMode={SelectionMode.Partial}
            onPaneClick={() => {
              setSelected(null)
              setMenu(null)
            }}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1d2433" />
            <Controls className="!bg-ink-800 !border-ink-700" />
            <MiniMap
              className="!bg-ink-900"
              maskColor="rgba(0,0,0,0.6)"
              nodeColor={(n) => ENTITY_TYPES[(n.data as { entity: EntityNode }).entity.type].color}
            />
          </ReactFlow>

          {/* Live transform run log */}
          {runs.length > 0 && (
            <div className="absolute left-3 bottom-3 z-20 w-[22rem] max-w-[calc(100%-1.5rem)] card !bg-ink-900/95 backdrop-blur shadow-2xl">
              <div className="flex items-center justify-between px-3 py-2 border-b border-ink-700">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Sparkles size={14} className="text-accent" /> Transform log
                  {runs.some((r) => r.status === 'running') && <Loader2 size={12} className="animate-spin text-accent" />}
                  <span className="text-xs text-slate-500 font-normal">({runs.length})</span>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost !p-1" title="Clear log" onClick={() => setRuns([])}>
                    <Trash2 size={13} />
                  </button>
                  <button className="btn-ghost !p-1" title={logOpen ? 'Collapse' : 'Expand'} onClick={() => setLogOpen((v) => !v)}>
                    {logOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                </div>
              </div>
              {logOpen && (
                <div className="max-h-64 overflow-y-auto divide-y divide-ink-800">
                  {runs.map((r) => {
                    const cfg = ENTITY_TYPES[r.targetType]
                    const icon =
                      r.status === 'running' ? <Loader2 size={14} className="animate-spin text-accent shrink-0" />
                      : r.status === 'done' ? <Check size={14} className="text-ok shrink-0" />
                      : r.status === 'empty' ? <Minus size={14} className="text-slate-500 shrink-0" />
                      : r.status === 'skipped' ? <KeyRound size={14} className="text-warn shrink-0" />
                      : <AlertTriangle size={14} className="text-danger shrink-0" />
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          const n = nodes.find((nn) => {
                            const e = (nn.data as { entity: EntityNode }).entity
                            return e.label === r.target && e.type === r.targetType
                          })
                          if (n) setSelected((n.data as { entity: EntityNode }).entity)
                        }}
                        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-ink-800"
                      >
                        {icon}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-slate-200 flex items-center gap-1.5">
                            <span className="font-medium truncate">{r.label}</span>
                            {r.status === 'done' && r.added != null && r.added > 0 && (
                              <span className="text-[10px] text-ok border border-ok/30 rounded px-1 shrink-0">+{r.added}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            <span style={{ color: cfg.color }}>{cfg.label}</span> · {r.target || '—'}
                          </div>
                          {(r.summary || r.error) && (
                            <div className={`text-[11px] mt-0.5 break-all leading-snug ${r.status === 'error' ? 'text-danger' : 'text-slate-400'}`}>
                              {r.error ?? r.summary}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {selected && (
          <EntityInspector
            entity={selected}
            onChange={updateSelected}
            onDelete={deleteSelected}
            onClose={() => setSelected(null)}
            onPivot={() =>
              setPivot({
                value: selected.label,
                subject: subjectForEntity(selected.type)
              })
            }
            transforms={transformsFor(selected.type)}
            busyTransform={busyTransform}
            apiKeys={settings.apiKeys ?? {}}
            linkUrl={entityUrl(selected)}
            onOpenLink={() => openLink(selected)}
            onTransform={(t) => runTransform(selected, t)}
            onRunAll={() => runAllTransforms(selected)}
            onAddToNotes={() => addEntityToNotes(selected)}
            onPickEvidenceImage={openImagePicker}
            onUploadImage={uploadEntityImage}
            onClearImage={clearEntityImage}
          />
        )}
      </div>

      {boardModal}

      <PivotModal
        open={!!pivot}
        onClose={() => setPivot(null)}
        subject={pivot?.subject ?? 'generic'}
        value={pivot?.value ?? ''}
      />

      {imgPicker && (
        <Modal open onClose={() => setImgPicker(false)} title="Attach an image from evidence" wide>
          {pickEvidence.length === 0 ? (
            <div className="text-center text-slate-500 py-10">
              No image evidence{board?.projectId ? ' in this investigation' : ''} yet.
              <div className="mt-3">
                <button className="btn-ghost border border-ink-600" onClick={() => nav('/evidence')}>
                  Open Evidence Board
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
              {pickEvidence.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => chooseEvidenceImage(ev)}
                  className="group card-interactive overflow-hidden"
                  title={ev.title || ev.sourceUrl || 'evidence'}
                >
                  <div className="aspect-square bg-ink-950">
                    <img src={ev.path} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-1.5 text-[10px] text-slate-400 truncate">{ev.title || ev.sourceUrl || 'Evidence'}</div>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Right-click node context menu */}
      {menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu(null)
            }}
          />
          <div
            className="fixed z-50 w-60 card py-1 shadow-2xl max-h-[70vh] overflow-y-auto"
            style={{ left: Math.min(menu.x, window.innerWidth - 250), top: Math.min(menu.y, window.innerHeight - 360) }}
          >
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-500 truncate">
              {ENTITY_TYPES[menu.entity.type].label}: {menu.entity.label || '—'}
            </div>
            {entityUrl(menu.entity) && (
              <>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-200 hover:bg-ink-700"
                  onClick={() => {
                    openLink(menu.entity)
                    setMenu(null)
                  }}
                >
                  <Globe size={14} /> Open link in browser
                </button>
                <div className="border-t border-ink-700 my-1" />
              </>
            )}
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-200 hover:bg-ink-700"
              onClick={() => {
                setPivot({ value: menu.entity.label, subject: subjectForEntity(menu.entity.type) })
                setMenu(null)
              }}
            >
              <Crosshair size={14} /> Pivot — search everywhere
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-200 hover:bg-ink-700"
              onClick={() => {
                addEntityToNotes(menu.entity)
                setMenu(null)
              }}
            >
              <Icon name="NotebookPen" size={14} /> Add to notes
            </button>
            <div className="border-t border-ink-700 my-1" />
            <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-slate-600">Transforms</div>
            {transformsFor(menu.entity.type).length === 0 ? (
              <div className="px-3 py-1.5 text-xs text-slate-500">None for this type — use Pivot</div>
            ) : (
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-accent-glow hover:bg-ink-700 disabled:opacity-40"
                disabled={busyTransform === '__all__'}
                onClick={() => {
                  runAllTransforms(menu.entity)
                  setMenu(null)
                }}
              >
                {busyTransform === '__all__' ? <Loader2 size={14} className="animate-spin shrink-0" /> : <Sparkles size={14} className="shrink-0" />}
                <span className="flex-1 text-left font-medium">Run all transforms</span>
              </button>
            )}
            {transformsFor(menu.entity.type).map((t) => {
              const locked = !!t.needsKey && !(settings.apiKeys ?? {})[t.needsKey]
              return (
                <button
                  key={t.id}
                  disabled={locked || busyTransform === t.id}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-200 hover:bg-ink-700 disabled:opacity-40"
                  onClick={() => {
                    runTransform(menu.entity, t)
                    setMenu(null)
                  }}
                >
                  <Sparkles size={14} className="text-accent shrink-0" />
                  <span className="flex-1 text-left truncate">{t.label}</span>
                  {t.network && <span className="text-[9px] text-slate-500 border border-ink-600 rounded px-1">NET</span>}
                  {locked && <span className="text-[9px] text-warn border border-warn/40 rounded px-1">KEY</span>}
                </button>
              )
            })}
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 card px-4 py-2.5 text-sm text-slate-200 border-brand/30 shadow-xl max-w-sm">
          {toast}
        </div>
      )}
    </div>
  )
}

function EntityInspector({
  entity,
  onChange,
  onDelete,
  onClose,
  onPivot,
  transforms,
  busyTransform,
  apiKeys,
  linkUrl,
  onOpenLink,
  onTransform,
  onRunAll,
  onAddToNotes,
  onPickEvidenceImage,
  onUploadImage,
  onClearImage
}: {
  entity: EntityNode
  onChange: (p: Partial<EntityNode>) => void
  onDelete: () => void
  onClose: () => void
  onPivot: () => void
  transforms: Transform[]
  busyTransform: string | null
  apiKeys: Record<string, string>
  linkUrl: string | null
  onOpenLink: () => void
  onTransform: (t: Transform) => void
  onRunAll: () => void
  onAddToNotes: () => void
  onPickEvidenceImage: () => void
  onUploadImage: () => void
  onClearImage: () => void
}): JSX.Element {
  const [propKey, setPropKey] = useState('')
  const [propVal, setPropVal] = useState('')
  const addProp = (): void => {
    if (!propKey.trim()) return
    onChange({ props: { ...entity.props, [propKey.trim()]: propVal } })
    setPropKey('')
    setPropVal('')
  }
  const removeProp = (k: string): void => {
    const next = { ...entity.props }
    delete next[k]
    onChange({ props: next })
  }

  return (
    <div className="w-80 shrink-0 border-l border-ink-700 bg-ink-900 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700">
        <span className="font-semibold text-slate-100">Entity</span>
        <button className="btn-ghost !p-1.5" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={entity.type}
            onChange={(e) => onChange({ type: e.target.value as EntityType })}
          >
            {Object.entries(ENTITY_TYPES).map(([t, cfg]) => (
              <option key={t} value={t}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Label</label>
          <input className="input" value={entity.label} onChange={(e) => onChange({ label: e.target.value })} />
        </div>

        {/* Image — pick from evidence or upload, attach to this entity */}
        <div>
          <label className="label">Image</label>
          {entity.props.image ? (
            <div className="relative">
              <img src={entity.props.image} alt="" className="w-full rounded-lg border border-ink-700 object-cover max-h-48" />
              <button
                className="absolute top-1.5 right-1.5 btn-ghost !p-1 bg-ink-900/80 border border-ink-600"
                title="Remove image"
                onClick={onClearImage}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-ink-600 p-3 text-center text-xs text-slate-500">
              No image attached
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button className="btn-ghost border border-ink-600 justify-center text-xs" onClick={onPickEvidenceImage}>
              <ImagePlus size={14} /> From evidence
            </button>
            <button className="btn-ghost border border-ink-600 justify-center text-xs" onClick={onUploadImage}>
              <ImageDown size={14} /> Upload
            </button>
          </div>
        </div>

        {linkUrl && (
          <button className="btn-ghost border border-ink-600 w-full justify-center" onClick={onOpenLink} title={linkUrl}>
            <Globe size={15} /> Open link in browser
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-primary justify-center" disabled={!entity.label.trim()} onClick={onPivot}>
            <Crosshair size={15} /> Pivot
          </button>
          <button className="btn-ghost border border-ink-600 justify-center" disabled={!entity.label.trim()} onClick={onAddToNotes}>
            <Icon name="NotebookPen" size={15} /> Add to notes
          </button>
        </div>

        {/* Transforms (Maltego-style automations) */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={14} className="text-accent" />
            <label className="label !mb-0">Transforms</label>
          </div>
          <p className="text-[11px] text-slate-500 mb-2">
            Pull related entities & data into the graph. Locked ones need an API key (Settings).
          </p>
          {transforms.length === 0 && (
            <p className="text-[11px] text-slate-500 mb-2">
              No transforms for this type yet — use <b>Pivot</b> to search the web.
            </p>
          )}
          {transforms.length > 0 && (
            <button
              className="btn-primary w-full justify-center mb-2"
              disabled={!!busyTransform}
              onClick={onRunAll}
              title="Run every available transform and pull all results into the graph"
            >
              {busyTransform === '__all__' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              Run all transforms
            </button>
          )}
          <div className="space-y-1.5">
            {transforms.map((t) => {
              const locked = !!t.needsKey && !apiKeys[t.needsKey]
              const busy = busyTransform === t.id
              return (
                <button
                  key={t.id}
                  disabled={busy || !entity.label.trim()}
                  onClick={() => onTransform(t)}
                  title={t.description + (locked ? ` (needs ${t.needsKey} API key)` : '')}
                  className="w-full text-left px-2.5 py-2 rounded-lg border border-ink-700 hover:border-accent/40 hover:bg-ink-800 disabled:opacity-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {busy ? (
                      <Loader2 size={14} className="animate-spin text-accent shrink-0" />
                    ) : (
                      <Sparkles size={14} className="text-accent shrink-0" />
                    )}
                    <span className="text-sm font-medium text-slate-200 flex-1">{t.label}</span>
                    {t.network && <span className="text-[9px] text-slate-500 border border-ink-600 rounded px-1">NET</span>}
                    {locked && <span className="text-[9px] text-warn border border-warn/40 rounded px-1">KEY</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{t.description}</div>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="label">Image</label>
          <div className="flex items-center gap-3">
            {entity.props.image ? (
              <img src={entity.props.image} alt="" className="w-16 h-16 rounded-lg object-cover border border-ink-600" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-ink-800 border border-ink-700 flex items-center justify-center">
                <Icon name="Image" size={20} className="text-slate-600" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <button
                className="btn-ghost border border-ink-600 text-xs"
                onClick={async () => {
                  const url = await api.files.pickImage('entities')
                  if (url) onChange({ props: { ...entity.props, image: url } })
                }}
              >
                <ImagePlus size={14} /> {entity.props.image ? 'Change' : 'Attach'}
              </button>
              {entity.props.image && (
                <button
                  className="btn-ghost text-slate-500 text-xs"
                  onClick={() => {
                    const next = { ...entity.props }
                    delete next.image
                    onChange({ props: next })
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={entity.notes ?? ''}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Properties</label>
          <div className="space-y-1.5 mb-2">
            {Object.entries(entity.props).filter(([k]) => k !== 'image').map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-sm">
                <span className="text-slate-400 w-24 truncate">{k}</span>
                <span className="text-slate-200 flex-1 truncate">{v}</span>
                <button className="btn-ghost !p-1" onClick={() => removeProp(k)}>
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input className="input py-1.5 text-sm" placeholder="key" value={propKey} onChange={(e) => setPropKey(e.target.value)} />
            <input
              className="input py-1.5 text-sm"
              placeholder="value"
              value={propVal}
              onChange={(e) => setPropVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addProp()}
            />
            <button className="btn-ghost !px-2" onClick={addProp}>
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-auto p-4 border-t border-ink-700">
        <button className="btn-danger w-full justify-center" onClick={onDelete}>
          <Trash2 size={15} /> Delete entity
        </button>
      </div>
    </div>
  )
}
