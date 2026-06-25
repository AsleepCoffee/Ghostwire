import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, ExternalLink, FileText, Check, ArrowRight } from 'lucide-react'
import { api } from '../lib/api'
import { Icon } from '../components/ui'

/** The report template seeded into Notes for the practical exam write-up. */
const REPORT_TEMPLATE = `# OSINT Investigation Report

- **Analyst:**
- **Date:**
- **Subject / target:**
- **Scope & authorization:**

## 1. Executive summary
_A few sentences: who/what was investigated, the key findings, and your overall assessment._

## 2. Objectives
_The questions you were asked to answer._

## 3. Methodology
_Tools and sources used, sock puppet(s) and their VPN exit, and the time window of collection. Note the subject's time zone._

## 4. Findings
### Identity (name, DOB, location, employer)
### Online accounts & usernames
### Email addresses & breach exposure
### Phone numbers
### Social media presence
### Public records
### Images & geolocation (EXIF / reverse image search)
### Infrastructure (domains, IPs, hosting)

## 5. Link analysis
_Reference the GhostWire link chart; attach the exported PNG._

## 6. Evidence log
| # | Item | Source URL | Captured (UTC) | SHA-256 |
|---|------|-----------|----------------|---------|
| 1 |      |           |                |         |

## 7. Conclusions & assessment
_What you can state with confidence, and your confidence level for each. Note gaps and assumptions._

## 8. Appendix
_Raw artifacts, full screenshots, additional notes._
`

interface Step {
  title: string
  body: string
  to?: string
}

const STEPS: Step[] = [
  { title: 'Scope & rules of engagement', body: 'Read the brief carefully. Note exactly what you must find and any boundaries. Set the investigation up first.', to: '/projects' },
  { title: 'Set up a clean sock puppet', body: 'Create a persona with an isolated session, route it through one of the provided/your VPN exits, and use it for all collection — never your real accounts.', to: '/sock-puppets' },
  { title: 'Username enumeration', body: 'Run the subject\'s handles across platforms and drop the hits onto the link chart.', to: '/enumerate' },
  { title: 'Email, phone & breach exposure', body: 'Pivot on emails/phones; check breaches and registered services with your API keys.', to: '/dork' },
  { title: 'Social media & public records', body: 'Use the embedded browser as your persona; capture each finding as evidence (region screenshot → hashed & timestamped).', to: '/browser' },
  { title: 'Images & geolocation', body: 'Pull every image into the Evidence Board; read EXIF/GPS and run reverse image search (Yandex/Lens/PimEyes).', to: '/evidence' },
  { title: 'Map & link analysis', body: 'Build the relationships on the graph, run transforms, tidy and merge duplicates so the picture is clear.', to: '/graph' },
  { title: 'Keep a methodology trail', body: 'Everything is auto-logged to the Case Timeline — that\'s your reproducible methodology for the report.', to: '/timeline' },
  { title: 'Write & export the report', body: 'Use the template below, then Investigation → Report → PDF (bundles the chart, evidence with hashes, notes & timeline).', to: '/projects' }
]

export function ExamPrep(): JSX.Element {
  const nav = useNavigate()
  const [made, setMade] = useState(false)

  const createTemplate = async (): Promise<void> => {
    const d = new Date()
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    await api.notes.save({ title: `PORP Report — ${stamp}`, body: REPORT_TEMPLATE, folder: 'Reports' })
    setMade(true)
    setTimeout(() => nav('/notes'), 600)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <GraduationCap size={22} className="text-brand-glow" /> PORP Exam Prep
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            How to pass the Practical OSINT Research Professional exam — and how GhostWire covers each step.
          </p>
        </div>

        <section className="card p-5">
          <h2 className="font-semibold text-slate-100 mb-2">What's required</h2>
          <p className="text-sm text-slate-400">
            You have <b className="text-slate-200">three full days</b> to complete the assessment and write a professional
            report. To pass you must:
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
            <li className="flex gap-2"><Check size={15} className="text-ok shrink-0 mt-0.5" /> Solve challenges using OSINT methodologies across social media, public records, online databases and other public sources.</li>
            <li className="flex gap-2"><Check size={15} className="text-ok shrink-0 mt-0.5" /> Deliver a detailed, professionally written report (a template is provided below).</li>
          </ul>
          <p className="text-[11px] text-slate-600 mt-3">
            It's an open-book, live-target exam — there are no fixed "answers." Success comes from solid methodology, careful
            evidence handling, and a clear report. This page is your checklist + template, not exam answers.
          </p>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-slate-100 mb-3">Methodology checklist</h2>
          <ol className="space-y-2">
            {STEPS.map((s, i) => (
              <li key={i}>
                <button
                  className="w-full flex items-start gap-3 text-left rounded-lg p-2.5 hover:bg-ink-800 transition-colors group"
                  onClick={() => s.to && nav(s.to)}
                >
                  <span className="w-6 h-6 shrink-0 rounded-full bg-brand/15 text-brand-glow text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-slate-200">{s.title}</span>
                    <span className="block text-xs text-slate-500">{s.body}</span>
                  </span>
                  {s.to && <ArrowRight size={14} className="text-slate-600 group-hover:text-brand-glow shrink-0 mt-1" />}
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-slate-100 mb-1">Professional report template</h2>
          <p className="text-sm text-slate-500 mb-3">
            Create a ready-to-fill report note (sections, evidence-log table, link-analysis placeholder). Write it as you go,
            then export the whole case as a PDF from the investigation.
          </p>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={createTemplate} disabled={made}>
              {made ? <Check size={16} /> : <FileText size={16} />} {made ? 'Created — opening Notes…' : 'Create report template note'}
            </button>
            <button className="btn-ghost border border-ink-600" onClick={() => nav('/projects')}>
              Investigation → Report → PDF
            </button>
          </div>
          <pre className="mt-4 text-[11px] text-slate-400 bg-ink-950 border border-ink-700 rounded-lg p-3 max-h-64 overflow-y-auto whitespace-pre-wrap">{REPORT_TEMPLATE}</pre>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-slate-100 mb-2">Resources</h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost border border-ink-600 text-xs" onClick={() => api.shell.openExternal('https://certifications.tcm-sec.com/porp/')}>
              <ExternalLink size={13} /> PORP certification
            </button>
            <button className="btn-ghost border border-ink-600 text-xs" onClick={() => api.shell.openExternal('https://academy.tcm-sec.com/')}>
              <ExternalLink size={13} /> TCM Academy
            </button>
            <button className="btn-ghost border border-ink-600 text-xs" onClick={() => nav('/notes?folder=Course')}>
              <Icon name="GraduationCap" size={13} /> Course Notes
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
