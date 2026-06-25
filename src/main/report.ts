import type { Activity, Board, EntityEdge, EntityNode, Evidence, Note, Persona, Project } from '../shared/types'

/** Everything needed to render a self-contained case report. */
export interface ReportData {
  project: Project
  evidence: (Evidence & { dataUri: string | null })[]
  notes: Note[]
  activity: Activity[]
  personas: Persona[]
  graphs: { board: Board; entities: EntityNode[]; edges: EntityEdge[] }[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmt(ts: number | string | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts)
  if (isNaN(d.getTime())) return ''
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Entity type → colour (mirrors the in-app palette) for the report's chart. */
const COLORS: Record<string, string> = {
  person: '#60a5fa', username: '#a78bfa', email: '#f472b6', phone: '#34d399', domain: '#22d3ee',
  ip: '#fbbf24', organization: '#fb923c', location: '#4ade80', social: '#818cf8', image: '#e879f9',
  document: '#94a3b8', wallet: '#facc15', custom: '#cbd5e1'
}
const colorOf = (t: string): string => COLORS[t] ?? '#cbd5e1'

/** Render a board as a static SVG link chart using stored node positions. */
function graphSvg(entities: EntityNode[], edges: EntityEdge[]): string {
  if (entities.length === 0) return '<p class="muted">No entities on this chart.</p>'
  const NW = 160
  const NH = 44
  const pad = 40
  const xs = entities.map((e) => e.x)
  const ys = entities.map((e) => e.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs) + NW
  const maxY = Math.max(...ys) + NH
  const W = maxX - minX + pad * 2
  const H = maxY - minY + pad * 2
  const pos = new Map(entities.map((e) => [e.id, { x: e.x - minX + pad, y: e.y - minY + pad }]))

  const lines = edges
    .map((ed) => {
      const a = pos.get(ed.source)
      const b = pos.get(ed.target)
      if (!a || !b) return ''
      const x1 = a.x + NW / 2, y1 = a.y + NH / 2, x2 = b.x + NW / 2, y2 = b.y + NH / 2
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#9aa4b2" stroke-width="1.5"/>${
        ed.label ? `<text x="${mx}" y="${my - 3}" class="edgelbl">${esc(ed.label)}</text>` : ''
      }`
    })
    .join('')

  const boxes = entities
    .map((e) => {
      const p = pos.get(e.id)!
      const c = colorOf(e.type)
      const label = e.label.length > 22 ? e.label.slice(0, 21) + '…' : e.label
      return `<g>
        <rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="8" fill="#ffffff" stroke="${c}" stroke-width="2"/>
        <rect x="${p.x}" y="${p.y}" width="6" height="${NH}" rx="3" fill="${c}"/>
        <text x="${p.x + 14}" y="${p.y + 18}" class="ntype" fill="${c}">${esc(e.type.toUpperCase())}</text>
        <text x="${p.x + 14}" y="${p.y + 34}" class="nlbl">${esc(label)}</text>
      </g>`
    })
    .join('')

  return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMidYMid meet">
    <style>
      .edgelbl{ font:10px sans-serif; fill:#6b7280; text-anchor:middle; }
      .ntype{ font:bold 8px sans-serif; letter-spacing:.5px; }
      .nlbl{ font:600 12px sans-serif; fill:#111827; }
    </style>
    ${lines}${boxes}
  </svg>`
}

export function buildHtmlReport(d: ReportData): string {
  const p = d.project
  const dp = p.dataPoints ?? []

  const dataPointsHtml = dp.length
    ? `<table><thead><tr><th>Type</th><th>Value</th><th>Note</th></tr></thead><tbody>${dp
        .map((x) => `<tr><td>${esc(x.type)}</td><td>${esc(x.value)}</td><td>${esc(x.note ?? '')}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p class="muted">No structured data points recorded.</p>'

  const graphsHtml = d.graphs.length
    ? d.graphs
        .map(
          (g) => `<h3>${esc(g.board.name)} <span class="muted">· ${g.entities.length} entities, ${g.edges.length} links</span></h3>
            <div class="chartwrap">${graphSvg(g.entities, g.edges)}</div>`
        )
        .join('')
    : '<p class="muted">No link charts in this investigation.</p>'

  const evidenceHtml = d.evidence.length
    ? d.evidence
        .map(
          (e) => `<div class="ev">
            ${e.dataUri ? `<img src="${e.dataUri}" alt=""/>` : '<div class="evfile">File</div>'}
            <div class="evmeta">
              <div class="evtitle">${esc(e.title || e.sourceUrl || 'Evidence')}</div>
              <div class="muted">Captured ${esc(fmt(e.capturedAt))}</div>
              ${e.sourceUrl ? `<div class="muted">Source: ${esc(e.sourceUrl)}</div>` : ''}
              ${e.sha256 ? `<div class="hash">SHA-256: ${esc(e.sha256)}</div>` : ''}
              ${e.note ? `<div class="evnote">${esc(e.note)}</div>` : ''}
            </div>
          </div>`
        )
        .join('')
    : '<p class="muted">No evidence captured.</p>'

  const notesHtml = d.notes.length
    ? d.notes
        .map((n) => `<div class="note"><h3>${esc(n.title)}</h3><pre>${esc(n.body)}</pre></div>`)
        .join('')
    : '<p class="muted">No notes linked to this investigation.</p>'

  const timelineHtml = d.activity.length
    ? `<ul class="timeline">${d.activity
        .map((a) => `<li><span class="when">${esc(fmt(a.at))}</span><span class="tag">${esc(a.type)}</span>${esc(a.message)}</li>`)
        .join('')}</ul>`
    : '<p class="muted">No recorded activity.</p>'

  const personasHtml = d.personas.length
    ? `<ul class="plist">${d.personas
        .map((pa) => `<li><b>${esc(pa.name)}</b> <span class="muted">@${esc(pa.handle)} · ${esc(pa.status)}</span></li>`)
        .join('')}</ul>`
    : '<p class="muted">No personas linked.</p>'

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${esc(p.name)} — Investigation report</title>
<style>
  :root{ --ink:#111827; --muted:#6b7280; --line:#e5e7eb; --accent:#2563eb; }
  *{ box-sizing:border-box; }
  body{ font:14px/1.55 -apple-system,Segoe UI,Roboto,sans-serif; color:var(--ink); margin:0; padding:40px; max-width:900px; margin:0 auto; }
  h1{ font-size:26px; margin:0 0 4px; }
  h2{ font-size:18px; margin:34px 0 10px; padding-bottom:6px; border-bottom:2px solid var(--line); }
  h3{ font-size:14px; margin:18px 0 8px; }
  .muted{ color:var(--muted); font-size:12px; }
  .sub{ color:var(--muted); margin:0 0 18px; }
  table{ border-collapse:collapse; width:100%; font-size:13px; }
  th,td{ border:1px solid var(--line); padding:6px 9px; text-align:left; vertical-align:top; }
  th{ background:#f9fafb; }
  .meta{ display:grid; grid-template-columns:repeat(2,1fr); gap:6px 24px; margin:10px 0 4px; }
  .meta div{ font-size:13px; }
  .meta b{ color:var(--muted); font-weight:600; margin-right:6px; }
  .chartwrap{ border:1px solid var(--line); border-radius:8px; padding:8px; background:#fafafa; overflow:hidden; }
  svg.chart{ width:100%; height:auto; max-height:520px; }
  .ev{ display:flex; gap:12px; border:1px solid var(--line); border-radius:8px; padding:10px; margin:10px 0; page-break-inside:avoid; }
  .ev img{ width:160px; height:160px; object-fit:cover; border-radius:6px; flex:none; }
  .evfile{ width:160px; height:160px; display:flex; align-items:center; justify-content:center; background:#f3f4f6; border-radius:6px; color:var(--muted); }
  .evtitle{ font-weight:600; margin-bottom:2px; }
  .hash{ font:11px ui-monospace,monospace; color:var(--muted); word-break:break-all; margin-top:4px; }
  .evnote{ margin-top:6px; font-size:13px; }
  .note{ border:1px solid var(--line); border-radius:8px; padding:10px 12px; margin:10px 0; page-break-inside:avoid; }
  .note pre{ white-space:pre-wrap; font:13px/1.5 inherit; margin:0; }
  .timeline{ list-style:none; padding:0; margin:0; }
  .timeline li{ padding:5px 0; border-bottom:1px solid var(--line); font-size:13px; }
  .timeline .when{ color:var(--muted); margin-right:10px; font-variant-numeric:tabular-nums; }
  .tag{ display:inline-block; background:#eef2ff; color:#4338ca; border-radius:4px; padding:0 6px; margin-right:8px; font-size:11px; text-transform:uppercase; }
  .plist,.timeline{ }
  .plist{ list-style:none; padding:0; } .plist li{ padding:3px 0; }
  footer{ margin-top:40px; padding-top:12px; border-top:1px solid var(--line); color:var(--muted); font-size:12px; }
  @media print{ body{ padding:0; } h2{ page-break-after:avoid; } }
</style></head>
<body>
  <h1>${esc(p.name)}</h1>
  <p class="sub">Investigation report · generated ${esc(fmt(new Date()))}</p>

  <div class="meta">
    <div><b>Type</b>${esc(p.type)}</div>
    <div><b>Status</b>${esc(p.status)}</div>
    ${p.subject ? `<div><b>Subject</b>${esc(p.subject)}</div>` : ''}
    <div><b>Created</b>${esc(fmt(p.createdAt))}</div>
  </div>

  ${p.objectives ? `<h2>Objectives</h2><pre style="white-space:pre-wrap;font:inherit;margin:0">${esc(p.objectives)}</pre>` : ''}
  ${p.known ? `<h2>Background &amp; notes</h2><pre style="white-space:pre-wrap;font:inherit;margin:0">${esc(p.known)}</pre>` : ''}

  <h2>Known information</h2>
  ${dataPointsHtml}

  <h2>Link analysis</h2>
  ${graphsHtml}

  <h2>Evidence <span class="muted">(${d.evidence.length})</span></h2>
  ${evidenceHtml}

  <h2>Notes</h2>
  ${notesHtml}

  <h2>Personas</h2>
  ${personasHtml}

  <h2>Activity timeline</h2>
  ${timelineHtml}

  <footer>Generated by GhostWire — OSINT Workbench. Evidence hashes are SHA-256 of the stored file at capture time.</footer>
</body></html>`
}
