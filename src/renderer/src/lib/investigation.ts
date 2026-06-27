import { api, type Board, type EntityType } from './api'
import { autoLink } from './graphlink'

/** One entity to push into the investigation (a graph node / data point). */
export interface AddEntity {
  type: EntityType
  label: string
  props?: Record<string, string>
}

const key = (type: string, label: string): string => `${type}:${label.trim().toLowerCase()}`

/** Find the active investigation's link chart, creating it if needed. When no
 *  investigation is active, falls back to the first project-less board. */
export async function findOrCreateBoard(projectId: string | null, name: string): Promise<Board> {
  const boards = await api.boards.list()
  const found =
    boards.find((b) => b.projectId === projectId) ?? (projectId ? undefined : boards.find((b) => !b.projectId))
  return found ?? (await api.boards.save({ name, projectId }))
}

/**
 * Add picked findings to the active investigation: nodes on the link chart
 * (linked to an optional anchor, e.g. the domain or username they pivot from),
 * de-duplicated against what's already there, then Maltego-style auto-linked.
 * Optionally also records them as structured data points on the project so they
 * show up in the sidebar / report as "known information".
 */
export async function addToInvestigation(opts: {
  projectId: string | null
  anchor?: AddEntity
  entities: AddEntity[]
  /** Also save as project data points (known information). Default true. */
  dataPoints?: boolean
}): Promise<{ nodes: number; links: number }> {
  const { projectId, anchor, entities } = opts
  const board = await findOrCreateBoard(projectId, anchor ? `${anchor.label} — link chart` : 'Link chart')

  const g = await api.boards.graph(board.id)
  const existing = new Map(g.nodes.map((n) => [key(n.type, n.label), n.id]))

  const getOrAdd = async (e: AddEntity, x: number, y: number): Promise<string> => {
    const k = key(e.type, e.label)
    const hit = existing.get(k)
    if (hit) return hit
    const node = await api.boards.saveNode({ boardId: board.id, type: e.type, label: e.label, props: e.props ?? {}, x, y })
    existing.set(k, node.id)
    return node.id
  }

  let added = 0
  const anchorId = anchor ? await getOrAdd(anchor, 0, 0) : null
  if (anchor && !g.nodes.some((n) => key(n.type, n.label) === key(anchor.type, anchor.label))) added++

  const n = entities.length
  let i = 0
  for (const e of entities) {
    const before = existing.size
    const x = anchor ? 300 : (i % 6) * 170
    const y = anchor ? (i - (n - 1) / 2) * 64 : Math.floor(i / 6) * 90
    const id = await getOrAdd(e, x, y)
    if (existing.size > before) added++
    if (anchorId && id !== anchorId) await api.boards.saveEdge({ boardId: board.id, source: anchorId, target: id }).catch(() => {})
    i++
  }

  const links = await autoLink(board.id)

  if (opts.dataPoints !== false && projectId) {
    await addDataPoints(projectId, anchor ? [anchor, ...entities] : entities)
  }
  return { nodes: added, links }
}

/** Record entities as project data points (known information), de-duplicated. */
export async function addDataPoints(projectId: string, entities: AddEntity[]): Promise<number> {
  const proj = await api.projects.get(projectId)
  if (!proj) return 0
  const have = new Set((proj.dataPoints ?? []).map((d) => key(d.type, d.value)))
  const additions = entities.filter((e) => e.label.trim() && !have.has(key(e.type, e.label)))
  if (!additions.length) return 0
  const dataPoints = [
    ...(proj.dataPoints ?? []),
    ...additions.map((e) => ({ id: crypto.randomUUID(), type: e.type, value: e.label.trim() }))
  ]
  await api.projects.save({ id: projectId, dataPoints })
  return additions.length
}
