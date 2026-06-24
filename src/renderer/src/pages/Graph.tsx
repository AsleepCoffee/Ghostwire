import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  type Node,
  type Edge,
  type Connection,
  type NodeProps
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus, Trash2, X, ImagePlus, Crosshair } from 'lucide-react'
import { api, type Board, type EntityNode, type EntityType } from '../lib/api'
import { ENTITY_TYPES } from '../lib/constants'
import { Icon, EmptyState } from '../components/ui'
import { PivotModal } from '../components/PivotModal'
import { subjectForEntity, type PivotSubject } from '../lib/pivot'

type RFNode = Node<{ entity: EntityNode }>

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
  const seq = useRef(0)

  const board = boards.find((b) => b.id === boardId)

  const loadBoards = async (): Promise<void> => {
    const list = await api.boards.list()
    setBoards(list)
    if (!boardId && list.length) setBoardId(list[0].id)
  }
  useEffect(() => {
    loadBoards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const createBoard = async (): Promise<void> => {
    const name = prompt('Name this investigation board:', 'New Investigation')
    if (!name) return
    const b = await api.boards.save({ name })
    await loadBoards()
    setBoardId(b.id)
  }

  const deleteBoard = async (): Promise<void> => {
    if (!board) return
    if (!confirm(`Delete board "${board.name}" and all its entities?`)) return
    await api.boards.remove(board.id)
    setBoardId('')
    setSelected(null)
    loadBoards()
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

  const onNodeDragStop = useCallback((_: unknown, node: Node): void => {
    const entity = (node.data as { entity: EntityNode }).entity
    api.boards.saveNode({ ...entity, x: node.position.x, y: node.position.y })
  }, [])

  const onNodeClick = useCallback((_: unknown, node: Node): void => {
    setSelected((node.data as { entity: EntityNode }).entity)
  }, [])

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

  const entityTypeList = useMemo(() => Object.entries(ENTITY_TYPES) as [EntityType, typeof ENTITY_TYPES[EntityType]][], [])

  if (boards.length === 0) {
    return (
      <EmptyState
        icon="Workflow"
        title="No investigation boards yet"
        subtitle="Create a board to map out entities — people, emails, usernames, domains — and the links between them."
        action={
          <button className="btn-primary" onClick={createBoard}>
            <Plus size={16} /> New board
          </button>
        }
      />
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
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button className="btn-ghost" onClick={createBoard}>
          <Plus size={15} /> New board
        </button>
        {board && (
          <button className="btn-danger" onClick={deleteBoard}>
            <Trash2 size={15} /> Delete board
          </button>
        )}
        <div className="ml-auto text-xs text-slate-500">
          {nodes.length} entities · {edges.length} links · drag from node edge to link
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
        <div className="flex-1 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelected(null)}
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
          />
        )}
      </div>

      <PivotModal
        open={!!pivot}
        onClose={() => setPivot(null)}
        subject={pivot?.subject ?? 'generic'}
        value={pivot?.value ?? ''}
      />
    </div>
  )
}

function EntityInspector({
  entity,
  onChange,
  onDelete,
  onClose,
  onPivot
}: {
  entity: EntityNode
  onChange: (p: Partial<EntityNode>) => void
  onDelete: () => void
  onClose: () => void
  onPivot: () => void
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

        <button className="btn-primary w-full justify-center" disabled={!entity.label.trim()} onClick={onPivot}>
          <Crosshair size={15} /> Search everywhere
        </button>

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
