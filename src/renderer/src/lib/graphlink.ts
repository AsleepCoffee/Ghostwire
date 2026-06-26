import { api, type EntityNode } from './api'

/** A derived relationship between two existing nodes. */
interface Derived {
  source: string
  target: string
  label: string
}

const clean = (s: string): string => s.trim().toLowerCase().replace(/^@/, '')

/** Infer Maltego-style relationships between the entities already on a board:
 *  email ↔ its domain, sub-domain ↔ parent domain, email ↔ matching username. */
function deriveEdges(nodes: EntityNode[]): Derived[] {
  const out: Derived[] = []
  const domains = nodes.filter((n) => n.type === 'domain')
  const emails = nodes.filter((n) => n.type === 'email')
  const handles = nodes.filter((n) => n.type === 'username' || n.type === 'social')

  for (const e of emails) {
    const at = e.label.indexOf('@')
    if (at < 0) continue
    const local = clean(e.label.slice(0, at))
    const dom = clean(e.label.slice(at + 1))
    for (const d of domains) if (clean(d.label) === dom) out.push({ source: e.id, target: d.id, label: 'domain' })
    for (const u of handles) if (clean(u.label) === local && local.length > 2) out.push({ source: e.id, target: u.id, label: 'handle' })
  }

  // Sub-domain → parent domain (a.example.com → example.com).
  for (const a of domains) {
    for (const b of domains) {
      if (a.id === b.id) continue
      if (clean(a.label).endsWith('.' + clean(b.label))) out.push({ source: a.id, target: b.id, label: 'subdomain' })
    }
  }
  return out
}

/** Add any missing derived edges between existing nodes on a board (idempotent).
 *  Returns how many links were created. */
export async function autoLink(boardId: string): Promise<number> {
  const g = await api.boards.graph(boardId)
  const have = new Set<string>()
  for (const e of g.edges) {
    have.add(`${e.source}|${e.target}`)
    have.add(`${e.target}|${e.source}`)
  }
  let added = 0
  for (const d of deriveEdges(g.nodes)) {
    const key = `${d.source}|${d.target}`
    if (have.has(key)) continue
    have.add(key)
    have.add(`${d.target}|${d.source}`)
    await api.boards.saveEdge({ boardId, source: d.source, target: d.target, label: d.label })
    added++
  }
  return added
}
