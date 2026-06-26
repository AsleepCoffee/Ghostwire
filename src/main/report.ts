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

/** Day Month Year, 24h HH:MM — e.g. "24 Jun 2026, 14:32". */
function fmt(ts: number | string | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts)
  if (isNaN(d.getTime())) return ''
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Full timestamp with seconds + UTC offset — used for the chain-of-custody record. */
function fmtFull(ts: number | string | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts)
  if (isNaN(d.getTime())) return ''
  const p = (n: number): string => String(n).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const tz = `UTC${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} (${tz})`
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

const kindLabel: Record<string, string> = {
  screenshot: 'Screenshot', image: 'Image', file: 'File', document: 'Document'
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
      const pt = pos.get(e.id)!
      const c = colorOf(e.type)
      const label = e.label.length > 22 ? e.label.slice(0, 21) + '…' : e.label
      return `<g>
        <rect x="${pt.x}" y="${pt.y}" width="${NW}" height="${NH}" rx="8" fill="#ffffff" stroke="${c}" stroke-width="2"/>
        <rect x="${pt.x}" y="${pt.y}" width="6" height="${NH}" rx="3" fill="${c}"/>
        <text x="${pt.x + 14}" y="${pt.y + 18}" class="ntype" fill="${c}">${esc(e.type.toUpperCase())}</text>
        <text x="${pt.x + 14}" y="${pt.y + 34}" class="nlbl">${esc(label)}</text>
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

// ============================================================================
//  Section data — shared across every output format.
// ============================================================================

interface Section {
  id: string
  title: string
  count?: number
}

/** Which sections this report actually has, in order, for the table of contents. */
function tocSections(d: ReportData): Section[] {
  const p = d.project
  const out: Section[] = [{ id: 'overview', title: 'Overview' }]
  if (p.objectives) out.push({ id: 'objectives', title: 'Objectives' })
  if (p.known) out.push({ id: 'background', title: 'Background' })
  if (p.dataPoints?.length) out.push({ id: 'known', title: 'Known information', count: p.dataPoints.length })
  if (d.graphs.length) out.push({ id: 'links', title: 'Link analysis', count: d.graphs.length })
  out.push({ id: 'evidence', title: 'Evidence', count: d.evidence.length })
  if (d.notes.length) out.push({ id: 'notes', title: 'Notes', count: d.notes.length })
  if (d.personas.length) out.push({ id: 'personas', title: 'Personas', count: d.personas.length })
  if (d.activity.length) out.push({ id: 'timeline', title: 'Activity timeline', count: d.activity.length })
  out.push({ id: 'custody', title: 'Chain of custody', count: d.evidence.length })
  return out
}

function dataPointsTable(d: ReportData): string {
  const dp = d.project.dataPoints ?? []
  if (!dp.length) return '<p class="muted">No structured data points recorded.</p>'
  return `<table><thead><tr><th>Type</th><th>Value</th><th>Note</th></tr></thead><tbody>${dp
    .map((x) => `<tr><td>${esc(x.type)}</td><td>${esc(x.value)}</td><td>${esc(x.note ?? '')}</td></tr>`)
    .join('')}</tbody></table>`
}

/** Chain-of-custody appendix: one row per exhibit with its integrity hash. */
function custodyTable(d: ReportData): string {
  if (!d.evidence.length) return '<p class="muted">No evidence captured.</p>'
  return `<table class="custody"><thead><tr><th>#</th><th>Exhibit</th><th>Type</th><th>Captured</th><th>Source</th><th>SHA-256</th></tr></thead><tbody>${d.evidence
    .map(
      (e, i) => `<tr>
        <td>${i + 1}</td>
        <td>${esc(e.title || 'Untitled')}</td>
        <td>${esc(kindLabel[e.kind] ?? e.kind)}</td>
        <td>${esc(fmtFull(e.capturedAt))}</td>
        <td class="break">${e.sourceUrl ? esc(e.sourceUrl) : '—'}</td>
        <td class="mono break">${e.sha256 ? esc(e.sha256) : '<span class="muted">not hashed</span>'}</td>
      </tr>`
    )
    .join('')}</tbody></table>`
}

// ============================================================================
//  1. Interactive HTML deliverable
// ============================================================================

export function buildHtmlReport(d: ReportData): string {
  const p = d.project
  const toc = tocSections(d)

  const evidenceHtml = d.evidence.length
    ? `<div class="evgrid">${d.evidence
        .map(
          (e, i) => `<figure class="evcard">
            ${
              e.dataUri
                ? `<button class="evthumb" data-full="${e.dataUri}" data-cap="${esc(`Exhibit ${i + 1} — ${e.title || e.sourceUrl || ''}`)}" aria-label="Enlarge"><img src="${e.dataUri}" alt=""/></button>`
                : '<div class="evfile">FILE</div>'
            }
            <figcaption>
              <div class="evtitle">${esc(e.title || e.sourceUrl || `Exhibit ${i + 1}`)}</div>
              <div class="muted">${esc(fmt(e.capturedAt))}</div>
              ${e.sourceUrl ? `<a class="evsrc" href="${esc(e.sourceUrl)}" target="_blank" rel="noreferrer">${esc(e.sourceUrl)}</a>` : ''}
              ${e.note ? `<div class="evnote">${esc(e.note)}</div>` : ''}
              ${e.ocr ? `<details class="ocr"><summary>Extracted text (OCR)</summary><pre>${esc(e.ocr)}</pre></details>` : ''}
              ${
                e.sha256
                  ? `<div class="hashrow"><span class="hbadge" title="Integrity hash recorded at capture">✓ SHA-256</span><code class="mono" data-hash="${esc(e.sha256)}">${esc(e.sha256.slice(0, 16))}…</code><button class="cphash" data-hash="${esc(e.sha256)}">copy</button></div>`
                  : ''
              }
            </figcaption>
          </figure>`
        )
        .join('')}</div>`
    : '<p class="muted">No evidence captured.</p>'

  const graphsHtml = d.graphs.length
    ? d.graphs
        .map(
          (g) => `<h3>${esc(g.board.name)} <span class="muted">· ${g.entities.length} entities, ${g.edges.length} links</span></h3>
            <div class="chartwrap">${graphSvg(g.entities, g.edges)}</div>`
        )
        .join('')
    : '<p class="muted">No link charts in this investigation.</p>'

  const notesHtml = d.notes.length
    ? d.notes.map((n) => `<div class="note"><h3>${esc(n.title)}</h3><pre>${esc(n.body)}</pre></div>`).join('')
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

  const stats = [
    { n: d.evidence.length, l: 'Exhibits' },
    { n: d.graphs.reduce((s, g) => s + g.entities.length, 0), l: 'Entities' },
    { n: d.notes.length, l: 'Notes' },
    { n: d.personas.length, l: 'Personas' }
  ]

  const nav = toc
    .map((s) => `<a href="#${s.id}" data-target="${s.id}">${esc(s.title)}${s.count != null ? `<span class="navc">${s.count}</span>` : ''}</a>`)
    .join('')

  const section = (id: string, title: string, count: number | undefined, body: string): string =>
    `<section id="${id}"><h2>${esc(title)}${count != null ? ` <span class="muted">(${count})</span>` : ''}</h2>${body}</section>`

  const body = [
    section('overview', 'Overview', undefined, `
      <div class="statbar">${stats.map((s) => `<div class="stat"><b>${s.n}</b><span>${esc(s.l)}</span></div>`).join('')}</div>
      <div class="meta">
        <div><b>Type</b>${esc(p.type)}</div>
        <div><b>Status</b>${esc(p.status)}</div>
        ${p.subject ? `<div><b>Subject</b>${esc(p.subject)}</div>` : ''}
        <div><b>Created</b>${esc(fmt(p.createdAt))}</div>
      </div>`),
    p.objectives ? section('objectives', 'Objectives', undefined, `<pre class="prose">${esc(p.objectives)}</pre>`) : '',
    p.known ? section('background', 'Background', undefined, `<pre class="prose">${esc(p.known)}</pre>`) : '',
    p.dataPoints?.length ? section('known', 'Known information', p.dataPoints.length, dataPointsTable(d)) : '',
    d.graphs.length ? section('links', 'Link analysis', d.graphs.length, graphsHtml) : '',
    section('evidence', 'Evidence', d.evidence.length, evidenceHtml),
    d.notes.length ? section('notes', 'Notes', d.notes.length, notesHtml) : '',
    d.personas.length ? section('personas', 'Personas', d.personas.length, personasHtml) : '',
    d.activity.length ? section('timeline', 'Activity timeline', d.activity.length, timelineHtml) : '',
    section('custody', 'Chain of custody', d.evidence.length, `
      <p class="muted">Each exhibit's SHA-256 was recorded when it was captured. Re-hashing a file and matching this value proves it has not been altered since.</p>
      ${custodyTable(d)}`)
  ].join('\n')

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(p.name)} — Investigation report</title>
<style>
  :root{
    --bg:#f4f6fb; --panel:#ffffff; --ink:#0f172a; --muted:#64748b; --line:#e2e8f0;
    --accent:#2563eb; --accent2:#0ea5e9; --ok:#059669; --shadow:0 1px 3px rgba(15,23,42,.08),0 8px 24px rgba(15,23,42,.06);
  }
  html[data-theme="dark"]{
    --bg:#0b1120; --panel:#111a2e; --ink:#e2e8f0; --muted:#94a3b8; --line:#1e293b;
    --accent:#60a5fa; --accent2:#38bdf8; --ok:#34d399; --shadow:0 1px 3px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.3);
  }
  *{ box-sizing:border-box; }
  body{ font:14px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:var(--ink); background:var(--bg); margin:0; }
  a{ color:var(--accent); }
  .layout{ display:grid; grid-template-columns:240px 1fr; gap:0; max-width:1180px; margin:0 auto; }
  /* Sidebar / TOC */
  aside{ position:sticky; top:0; align-self:start; height:100vh; padding:26px 16px; border-right:1px solid var(--line); overflow:auto; }
  aside .brand{ font-weight:700; font-size:13px; letter-spacing:.4px; color:var(--accent); margin-bottom:2px; }
  aside .casen{ font-size:12px; color:var(--muted); margin-bottom:18px; word-break:break-word; }
  nav a{ display:flex; align-items:center; justify-content:space-between; gap:8px; text-decoration:none; color:var(--muted);
    padding:7px 10px; border-radius:8px; font-size:13px; font-weight:500; margin-bottom:2px; transition:.15s; }
  nav a:hover{ background:var(--line); color:var(--ink); }
  nav a.active{ background:var(--accent); color:#fff; }
  nav a.active .navc{ background:rgba(255,255,255,.25); color:#fff; }
  .navc{ background:var(--line); color:var(--muted); border-radius:20px; font-size:11px; padding:0 7px; line-height:18px; }
  .toolbtns{ margin-top:18px; display:flex; gap:8px; }
  .toolbtns button{ flex:1; cursor:pointer; border:1px solid var(--line); background:var(--panel); color:var(--muted);
    border-radius:8px; padding:7px 0; font-size:12px; }
  .toolbtns button:hover{ color:var(--ink); border-color:var(--accent); }
  /* Main */
  main{ padding:34px 40px 80px; min-width:0; }
  header.hd{ margin-bottom:8px; }
  header.hd h1{ font-size:28px; margin:0 0 4px; letter-spacing:-.3px; }
  header.hd .sub{ color:var(--muted); margin:0 0 6px; }
  section{ background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:20px 24px; margin:18px 0; box-shadow:var(--shadow); scroll-margin-top:18px; }
  h2{ font-size:17px; margin:0 0 14px; }
  h3{ font-size:14px; margin:16px 0 8px; }
  .muted{ color:var(--muted); font-size:12px; font-weight:400; }
  .prose{ white-space:pre-wrap; font:14px/1.6 inherit; margin:0; }
  table{ border-collapse:collapse; width:100%; font-size:13px; }
  th,td{ border:1px solid var(--line); padding:7px 10px; text-align:left; vertical-align:top; }
  th{ background:var(--bg); font-weight:600; }
  td.mono,.mono{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11.5px; }
  td.break,.break{ word-break:break-all; }
  .statbar{ display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
  .stat{ background:var(--bg); border:1px solid var(--line); border-radius:10px; padding:10px 16px; min-width:90px; }
  .stat b{ display:block; font-size:22px; line-height:1; }
  .stat span{ font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; }
  .meta{ display:grid; grid-template-columns:repeat(2,1fr); gap:6px 24px; }
  .meta div{ font-size:13px; }
  .meta b{ color:var(--muted); font-weight:600; margin-right:8px; }
  .chartwrap{ border:1px solid var(--line); border-radius:10px; padding:8px; background:var(--bg); overflow:auto; }
  svg.chart{ width:100%; height:auto; max-height:560px; }
  /* Evidence */
  .evgrid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:14px; }
  .evcard{ margin:0; border:1px solid var(--line); border-radius:12px; overflow:hidden; background:var(--bg); display:flex; flex-direction:column; }
  .evthumb{ border:0; padding:0; cursor:zoom-in; background:#0b1120; display:block; }
  .evthumb img{ width:100%; height:170px; object-fit:cover; display:block; }
  .evfile{ height:170px; display:flex; align-items:center; justify-content:center; background:var(--line); color:var(--muted); font-size:12px; letter-spacing:1px; }
  figcaption{ padding:10px 12px; }
  .evtitle{ font-weight:600; margin-bottom:2px; }
  .evsrc{ display:block; font-size:11px; word-break:break-all; margin-top:4px; }
  .evnote{ margin-top:6px; font-size:13px; }
  .ocr{ margin-top:6px; font-size:12px; } .ocr pre{ white-space:pre-wrap; margin:6px 0 0; font:12px/1.5 ui-monospace,monospace; color:var(--muted); }
  .hashrow{ display:flex; align-items:center; gap:6px; margin-top:8px; flex-wrap:wrap; }
  .hbadge{ background:color-mix(in srgb,var(--ok) 16%,transparent); color:var(--ok); font-size:10px; font-weight:700; padding:2px 7px; border-radius:20px; }
  .hashrow code{ color:var(--muted); }
  .cphash{ cursor:pointer; border:1px solid var(--line); background:transparent; color:var(--muted); border-radius:6px; font-size:10px; padding:1px 7px; }
  .cphash:hover{ color:var(--ink); }
  /* Notes / timeline / personas */
  .note{ border:1px solid var(--line); border-radius:10px; padding:10px 14px; margin:10px 0; }
  .note pre{ white-space:pre-wrap; font:13px/1.55 inherit; margin:0; }
  .timeline{ list-style:none; padding:0; margin:0; }
  .timeline li{ padding:6px 0; border-bottom:1px solid var(--line); font-size:13px; }
  .timeline .when{ color:var(--muted); margin-right:10px; font-variant-numeric:tabular-nums; }
  .tag{ display:inline-block; background:color-mix(in srgb,var(--accent) 14%,transparent); color:var(--accent); border-radius:5px; padding:0 6px; margin-right:8px; font-size:11px; text-transform:uppercase; }
  .plist{ list-style:none; padding:0; margin:0; } .plist li{ padding:4px 0; }
  /* Lightbox */
  .lb{ position:fixed; inset:0; background:rgba(2,6,23,.92); display:none; align-items:center; justify-content:center; flex-direction:column; z-index:99; padding:30px; }
  .lb.open{ display:flex; }
  .lb img{ max-width:94vw; max-height:84vh; border-radius:8px; box-shadow:0 20px 60px rgba(0,0,0,.6); }
  .lb .cap{ color:#cbd5e1; margin-top:14px; font-size:13px; }
  .lb .x{ position:absolute; top:18px; right:24px; color:#fff; font-size:30px; cursor:pointer; line-height:1; }
  footer{ color:var(--muted); font-size:12px; margin-top:20px; }
  @media (max-width:820px){ .layout{ grid-template-columns:1fr; } aside{ position:static; height:auto; border-right:0; border-bottom:1px solid var(--line); } }
  @media print{
    aside,.toolbtns,.cphash,.lb{ display:none !important; }
    .layout{ grid-template-columns:1fr; max-width:none; }
    body{ background:#fff; } section{ box-shadow:none; break-inside:avoid; }
    .evcard,.note{ break-inside:avoid; }
  }
</style></head>
<body>
  <div class="layout">
    <aside>
      <div class="brand">GHOSTWIRE</div>
      <div class="casen">${esc(p.name)}</div>
      <nav>${nav}</nav>
      <div class="toolbtns">
        <button id="themeBtn" title="Toggle dark mode">◐ Theme</button>
        <button id="printBtn" title="Print or save as PDF">⎙ Print</button>
      </div>
    </aside>
    <main>
      <header class="hd">
        <h1>${esc(p.name)}</h1>
        <p class="sub">Investigation report · generated ${esc(fmt(new Date()))}</p>
      </header>
      ${body}
      <footer>Generated by GhostWire — OSINT Workbench. Evidence hashes are SHA-256 of the stored file at capture time; this document is self-contained and works offline.</footer>
    </main>
  </div>
  <div class="lb" id="lb"><span class="x" id="lbx">&times;</span><img id="lbimg" alt=""/><div class="cap" id="lbcap"></div></div>
<script>
(function(){
  // Scrollspy: highlight the nav link of the section in view.
  var links = [].slice.call(document.querySelectorAll('nav a'));
  var map = {}; links.forEach(function(a){ map[a.dataset.target] = a; });
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){ links.forEach(function(l){ l.classList.remove('active'); }); var a = map[en.target.id]; if(a) a.classList.add('active'); }
    });
  }, { rootMargin:'-10% 0px -80% 0px' });
  document.querySelectorAll('section[id]').forEach(function(s){ obs.observe(s); });
  // Smooth scroll
  links.forEach(function(a){ a.addEventListener('click', function(e){ e.preventDefault(); var t=document.getElementById(a.dataset.target); if(t) t.scrollIntoView({behavior:'smooth'}); }); });
  // Lightbox
  var lb=document.getElementById('lb'), lbi=document.getElementById('lbimg'), lbc=document.getElementById('lbcap');
  document.querySelectorAll('.evthumb').forEach(function(b){ b.addEventListener('click', function(){ lbi.src=b.dataset.full; lbc.textContent=b.dataset.cap||''; lb.classList.add('open'); }); });
  function close(){ lb.classList.remove('open'); lbi.src=''; }
  document.getElementById('lbx').addEventListener('click', close);
  lb.addEventListener('click', function(e){ if(e.target===lb) close(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') close(); });
  // Copy hash
  document.querySelectorAll('.cphash').forEach(function(b){ b.addEventListener('click', function(){ navigator.clipboard && navigator.clipboard.writeText(b.dataset.hash); var t=b.textContent; b.textContent='copied'; setTimeout(function(){ b.textContent=t; }, 1200); }); });
  // Theme toggle
  document.getElementById('themeBtn').addEventListener('click', function(){ var h=document.documentElement; h.dataset.theme = h.dataset.theme==='dark'?'':'dark'; });
  // Print
  document.getElementById('printBtn').addEventListener('click', function(){ window.print(); });
})();
</script>
</body></html>`
}

// ============================================================================
//  2. Print HTML (used for PDF export — static, expanded, no scripts)
// ============================================================================

export function buildPrintReport(d: ReportData): string {
  const p = d.project
  const dp = d.project.dataPoints ?? []

  const graphsHtml = d.graphs.length
    ? d.graphs
        .map(
          (g) => `<h3>${esc(g.board.name)} <span class="muted">· ${g.entities.length} entities, ${g.edges.length} links</span></h3>
            <div class="chartwrap">${graphSvg(g.entities, g.edges)}</div>`
        )
        .join('')
    : '<p class="muted">No link charts.</p>'

  const evidenceHtml = d.evidence.length
    ? d.evidence
        .map(
          (e, i) => `<div class="ev">
            ${e.dataUri ? `<img src="${e.dataUri}" alt=""/>` : '<div class="evfile">File</div>'}
            <div class="evmeta">
              <div class="evtitle">Exhibit ${i + 1} — ${esc(e.title || e.sourceUrl || 'Evidence')}</div>
              <div class="muted">Captured ${esc(fmtFull(e.capturedAt))}</div>
              ${e.sourceUrl ? `<div class="muted">Source: ${esc(e.sourceUrl)}</div>` : ''}
              ${e.sha256 ? `<div class="hash">SHA-256: ${esc(e.sha256)}</div>` : ''}
              ${e.note ? `<div class="evnote">${esc(e.note)}</div>` : ''}
            </div>
          </div>`
        )
        .join('')
    : '<p class="muted">No evidence captured.</p>'

  const notesHtml = d.notes.length
    ? d.notes.map((n) => `<div class="note"><h3>${esc(n.title)}</h3><pre>${esc(n.body)}</pre></div>`).join('')
    : '<p class="muted">No notes.</p>'

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
  :root{ --ink:#111827; --muted:#6b7280; --line:#e5e7eb; }
  *{ box-sizing:border-box; }
  body{ font:14px/1.55 -apple-system,Segoe UI,Roboto,sans-serif; color:var(--ink); margin:0 auto; padding:40px; max-width:900px; }
  h1{ font-size:26px; margin:0 0 4px; }
  h2{ font-size:18px; margin:30px 0 10px; padding-bottom:6px; border-bottom:2px solid var(--line); }
  h3{ font-size:14px; margin:16px 0 8px; }
  .muted{ color:var(--muted); font-size:12px; }
  .sub{ color:var(--muted); margin:0 0 18px; }
  table{ border-collapse:collapse; width:100%; font-size:12.5px; }
  th,td{ border:1px solid var(--line); padding:6px 9px; text-align:left; vertical-align:top; }
  th{ background:#f9fafb; }
  .mono{ font-family:ui-monospace,monospace; font-size:11px; }
  .break{ word-break:break-all; }
  .meta{ display:grid; grid-template-columns:repeat(2,1fr); gap:6px 24px; margin:10px 0 4px; }
  .meta b{ color:var(--muted); font-weight:600; margin-right:6px; }
  .chartwrap{ border:1px solid var(--line); border-radius:8px; padding:8px; background:#fafafa; overflow:hidden; }
  svg.chart{ width:100%; height:auto; max-height:520px; }
  .ev{ display:flex; gap:12px; border:1px solid var(--line); border-radius:8px; padding:10px; margin:10px 0; page-break-inside:avoid; }
  .ev img{ width:160px; height:160px; object-fit:cover; border-radius:6px; flex:none; }
  .evfile{ width:160px; height:160px; display:flex; align-items:center; justify-content:center; background:#f3f4f6; border-radius:6px; color:var(--muted); }
  .evtitle{ font-weight:600; margin-bottom:2px; }
  .hash{ font:11px ui-monospace,monospace; color:var(--muted); word-break:break-all; margin-top:4px; }
  .evnote{ margin-top:6px; }
  .note{ border:1px solid var(--line); border-radius:8px; padding:10px 12px; margin:10px 0; page-break-inside:avoid; }
  .note pre{ white-space:pre-wrap; font:13px/1.5 inherit; margin:0; }
  .timeline{ list-style:none; padding:0; margin:0; }
  .timeline li{ padding:5px 0; border-bottom:1px solid var(--line); font-size:13px; }
  .timeline .when{ color:var(--muted); margin-right:10px; }
  .tag{ display:inline-block; background:#eef2ff; color:#4338ca; border-radius:4px; padding:0 6px; margin-right:8px; font-size:11px; text-transform:uppercase; }
  .plist{ list-style:none; padding:0; } .plist li{ padding:3px 0; }
  footer{ margin-top:36px; padding-top:12px; border-top:1px solid var(--line); color:var(--muted); font-size:12px; }
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
  ${dp.length ? `<h2>Known information</h2>${dataPointsTable(d)}` : ''}
  <h2>Link analysis</h2>${graphsHtml}
  <h2>Evidence <span class="muted">(${d.evidence.length})</span></h2>${evidenceHtml}
  ${d.notes.length ? `<h2>Notes</h2>${notesHtml}` : ''}
  ${d.personas.length ? `<h2>Personas</h2>${personasHtml}` : ''}
  ${d.activity.length ? `<h2>Activity timeline</h2>${timelineHtml}` : ''}
  <h2>Chain of custody</h2>
  <p class="muted">Each exhibit's SHA-256 was recorded at capture time. Re-hashing a file and matching this value proves it is unaltered.</p>
  ${custodyTable(d)}
  <footer>Generated by GhostWire — OSINT Workbench.</footer>
</body></html>`
}

// ============================================================================
//  3. DOCX-friendly HTML (minimal semantic markup for html-to-docx)
// ============================================================================

export function buildDocxHtml(d: ReportData): string {
  const p = d.project
  const dp = d.project.dataPoints ?? []
  const H: string[] = []
  H.push(`<h1>${esc(p.name)}</h1>`)
  H.push(`<p><i>Investigation report — generated ${esc(fmtFull(new Date()))}</i></p>`)
  H.push('<table><tr><td><b>Type</b></td><td>' + esc(p.type) + '</td></tr>' +
    '<tr><td><b>Status</b></td><td>' + esc(p.status) + '</td></tr>' +
    (p.subject ? '<tr><td><b>Subject</b></td><td>' + esc(p.subject) + '</td></tr>' : '') +
    '<tr><td><b>Created</b></td><td>' + esc(fmt(p.createdAt)) + '</td></tr></table>')

  if (p.objectives) { H.push('<h2>Objectives</h2>'); H.push(`<p>${esc(p.objectives).replace(/\n/g, '<br/>')}</p>`) }
  if (p.known) { H.push('<h2>Background &amp; notes</h2>'); H.push(`<p>${esc(p.known).replace(/\n/g, '<br/>')}</p>`) }

  if (dp.length) {
    H.push('<h2>Known information</h2>')
    H.push('<table><tr><td><b>Type</b></td><td><b>Value</b></td><td><b>Note</b></td></tr>' +
      dp.map((x) => `<tr><td>${esc(x.type)}</td><td>${esc(x.value)}</td><td>${esc(x.note ?? '')}</td></tr>`).join('') + '</table>')
  }

  if (d.graphs.length) {
    H.push('<h2>Link analysis</h2>')
    for (const g of d.graphs) {
      H.push(`<h3>${esc(g.board.name)} (${g.entities.length} entities, ${g.edges.length} links)</h3>`)
      if (g.entities.length) {
        H.push('<table><tr><td><b>Entity</b></td><td><b>Type</b></td></tr>' +
          g.entities.map((e) => `<tr><td>${esc(e.label)}</td><td>${esc(e.type)}</td></tr>`).join('') + '</table>')
      }
      if (g.edges.length) {
        const nm = new Map(g.entities.map((e) => [e.id, e.label]))
        H.push('<p><b>Links</b></p><ul>' +
          g.edges.map((ed) => `<li>${esc(nm.get(ed.source) ?? '?')} → ${esc(nm.get(ed.target) ?? '?')}${ed.label ? ' (' + esc(ed.label) + ')' : ''}</li>`).join('') + '</ul>')
      }
    }
  }

  H.push(`<h2>Evidence (${d.evidence.length})</h2>`)
  if (d.evidence.length) {
    d.evidence.forEach((e, i) => {
      H.push(`<h3>Exhibit ${i + 1} — ${esc(e.title || e.sourceUrl || 'Evidence')}</h3>`)
      if (e.dataUri) H.push(`<img src="${e.dataUri}" width="420"/>`)
      H.push(`<p><i>Captured ${esc(fmtFull(e.capturedAt))}</i></p>`)
      if (e.sourceUrl) H.push(`<p>Source: ${esc(e.sourceUrl)}</p>`)
      if (e.sha256) H.push(`<p style="font-size:9pt">SHA-256: ${esc(e.sha256)}</p>`)
      if (e.note) H.push(`<p>${esc(e.note).replace(/\n/g, '<br/>')}</p>`)
    })
  } else H.push('<p>No evidence captured.</p>')

  if (d.notes.length) {
    H.push('<h2>Notes</h2>')
    for (const n of d.notes) { H.push(`<h3>${esc(n.title)}</h3>`); H.push(`<p>${esc(n.body).replace(/\n/g, '<br/>')}</p>`) }
  }

  if (d.personas.length) {
    H.push('<h2>Personas</h2><ul>' +
      d.personas.map((pa) => `<li><b>${esc(pa.name)}</b> — @${esc(pa.handle)} (${esc(pa.status)})</li>`).join('') + '</ul>')
  }

  if (d.activity.length) {
    H.push('<h2>Activity timeline</h2>')
    H.push('<table><tr><td><b>When</b></td><td><b>Type</b></td><td><b>Event</b></td></tr>' +
      d.activity.map((a) => `<tr><td>${esc(fmt(a.at))}</td><td>${esc(a.type)}</td><td>${esc(a.message)}</td></tr>`).join('') + '</table>')
  }

  H.push('<h2>Chain of custody</h2>')
  H.push('<p>Each exhibit’s SHA-256 was recorded at capture time. Re-hashing a file and matching this value proves it is unaltered.</p>')
  if (d.evidence.length) {
    H.push('<table><tr><td><b>#</b></td><td><b>Exhibit</b></td><td><b>Captured</b></td><td><b>SHA-256</b></td></tr>' +
      d.evidence.map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.title || 'Untitled')}</td><td>${esc(fmtFull(e.capturedAt))}</td><td style="font-size:8pt">${e.sha256 ? esc(e.sha256) : 'not hashed'}</td></tr>`).join('') + '</table>')
  } else H.push('<p>No evidence captured.</p>')

  return `<!doctype html><html><head><meta charset="utf-8"/></head><body>${H.join('\n')}</body></html>`
}
