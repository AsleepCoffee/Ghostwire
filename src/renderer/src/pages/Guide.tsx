import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ArrowRight } from 'lucide-react'
import { Icon } from '../components/ui'

interface Point {
  t: string
  to?: string
  toLabel?: string
}
interface Section {
  id: string
  icon: string
  title: string
  blurb: string
  points: Point[]
}

const SECTIONS: Section[] = [
  {
    id: 'overview',
    icon: 'Compass',
    title: 'What GhostWire is',
    blurb:
      'GhostWire is an offline-first OSINT workbench. You run an investigation end-to-end: set up the case, work behind a disposable identity, collect findings as hashed evidence, map the relationships, and export a defensible report. Everything is stored locally in an encrypted-at-rest database — nothing is sent anywhere unless you use an online lookup or the in-app browser.',
    points: [
      { t: 'The loop: Case → Identity → Research → Evidence → Link analysis → Report. The sidebar is grouped the same way.' },
      { t: 'Most features work with no API keys. A few enrichments (Hunter, Email Hippo, HIBP, OpenAI, etc.) unlock when you add a key in Settings.', to: '/settings', toLabel: 'Settings' },
      { t: 'Press Ctrl/Cmd-K anywhere to jump to any tool or page.' }
    ]
  },
  {
    id: 'case',
    icon: 'FolderSearch',
    title: '1 · Start a case',
    blurb:
      'Create an investigation first — it becomes the active case that evidence, personas, notes and link charts attach to. Record what you already know and what you must find.',
    points: [
      { t: 'New investigation → give it a type (person, company…), the subject, your objectives, and the subject’s time zone (pick it on a map).', to: '/projects', toLabel: 'Investigations' },
      { t: 'Add “known information” data points (emails, handles, phones) — these seed your pivots later.' },
      { t: 'Set it as the active investigation so captures and findings file to it automatically.' }
    ]
  },
  {
    id: 'identity',
    icon: 'Drama',
    title: '2 · Work behind a sock puppet',
    blurb:
      'Never use your real accounts. Create a persona with an isolated browser session, a hardened fingerprint, and its own VPN exit, then do all collection as that identity.',
    points: [
      { t: 'Create a persona — it gets an isolated cookie/cache session and a stable, spoofed browser fingerprint so it can’t be correlated with your real browser.', to: '/sock-puppets', toLabel: 'Sock Puppets' },
      { t: 'Import a WireGuard config and assign it to the persona (or set an app-wide exit) so its traffic leaves through a chosen country.', to: '/vpn', toLabel: 'VPN' },
      { t: 'Give the persona a disposable mailbox for sign-ups; it can auto-fill registration forms.', to: '/mailbox', toLabel: 'Mailbox' }
    ]
  },
  {
    id: 'browser',
    icon: 'Globe',
    title: '3 · Browse in-app',
    blurb:
      'The built-in browser runs each tab under a persona’s session and VPN exit. Links opened anywhere in GhostWire land here — nothing escapes to your system browser.',
    points: [
      { t: 'Open a tab as a persona to browse as that identity. Right-click an image → Add to evidence to capture it (hashed + timestamped).', to: '/browser', toLabel: 'Browser' },
      { t: 'Use the capture button to screenshot a region straight into the Evidence Board.' },
      { t: 'Reverse-image search copies the image to your clipboard and opens the engine — paste with Ctrl+V (the image stays pinned on the right to re-copy).' }
    ]
  },
  {
    id: 'accounts',
    icon: 'ScanSearch',
    title: '4 · Find accounts & usernames',
    blurb: 'Check a username across hundreds of platforms and drop the hits onto your link chart.',
    points: [
      { t: 'Enter a handle in Account Finder; it tests it across sites and shows where it exists.', to: '/enumerate', toLabel: 'Account Finder' },
      { t: 'Open a hit in the in-app browser, or add it to the graph as a username/social node.' }
    ]
  },
  {
    id: 'email',
    icon: 'UserSearch',
    title: '5 · Email, phone & company intel',
    blurb:
      'Profile an email, parse a phone number, or look up a whole company’s people — then verify and check breach exposure.',
    points: [
      { t: 'Email mode: mail-server check, Gravatar profile + linked accounts, and free breach lookups — LeakCheck (which breaches it’s in) and Hudson Rock (info-stealer infections). No key needed.', to: '/intel', toLabel: 'Email & Phone' },
      { t: 'Add a Have I Been Pwned key for breach membership, and an Email Hippo key to verify a mailbox actually exists (deliverable / doesn’t exist).', to: '/settings', toLabel: 'API keys' },
      { t: 'Company mode (Hunter.io key): enter a company/domain to get its people, roles, the email pattern (e.g. {first}.{last}@), and one-click verify or add-to-chart.' },
      { t: 'Phone mode: validate a number and see its country and line type.' }
    ]
  },
  {
    id: 'infra',
    icon: 'Server',
    title: '6 · Domain & infrastructure',
    blurb: 'Map a domain or IP without any keys: WHOIS, DNS, subdomains and hosting.',
    points: [
      { t: 'Domain: WHOIS (RDAP), full DNS, crt.sh subdomains and hosting org/geo. IP: organization, ASN, location, network and reverse DNS.', to: '/infra', toLabel: 'Domain & IP' },
      { t: 'Add findings to the link chart or pivot on them.' }
    ]
  },
  {
    id: 'dork',
    icon: 'Binoculars',
    title: '7 · Dork & pivot',
    blurb: 'Build advanced search queries and fan a value out across many engines.',
    points: [
      { t: 'Compose a Google-style dork and run it in a tab, or fire it across Bing, DuckDuckGo, Yandex, Brave and more.', to: '/dork', toLabel: 'Dork & Pivot' },
      { t: 'The Pivot button (found throughout the app) runs a value across the right lookups for its type.' }
    ]
  },
  {
    id: 'evidence',
    icon: 'Images',
    title: '8 · Evidence & images',
    blurb:
      'The Evidence Board is your media locker. Everything captured is hashed (SHA-256) and timestamped for a defensible chain of custody.',
    points: [
      { t: 'Drag/paste images, paste an image URL, or capture from the browser. Click an image to view it full-screen and zoom in.', to: '/evidence', toLabel: 'Evidence Board' },
      { t: 'Read full EXIF/metadata and GPS, run offline OCR to extract text, and use “Verify integrity” to re-hash and prove a file is unaltered.' },
      { t: 'Geolocate: pin a location from EXIF GPS, an AI best-guess (OpenAI key), or by hand — pinned spots show on the Map.' }
    ]
  },
  {
    id: 'geo',
    icon: 'Map',
    title: '9 · Geolocation tools',
    blurb: 'Three ways to place a photo on the ground.',
    points: [
      { t: 'Map: every pinned location and photo-GPS plotted; each pin links to Street View.', to: '/map', toLabel: 'Map' },
      { t: 'Proximity Search: find everywhere two things sit close together (e.g. a Westin within 150 m of a Wendy’s) across a country/city.', to: '/co-locate', toLabel: 'Proximity' },
      { t: 'Cross-Reference Images: reverse-search several images and surface the page/board/profile that hosts all of them.', to: '/cross-ref', toLabel: 'Cross-Reference' }
    ]
  },
  {
    id: 'graph',
    icon: 'Workflow',
    title: '10 · Link analysis',
    blurb: 'Build the relationship picture on a canvas. Entities are colour-coded by type and can carry thumbnails.',
    points: [
      { t: 'Add entities and connect them; run transforms to enrich; merge duplicates to keep it clean.', to: '/graph', toLabel: 'Graph Workspace' },
      { t: 'Double-click a node to open its link in the in-app browser. The chart is embedded in your report.' }
    ]
  },
  {
    id: 'timeline',
    icon: 'History',
    title: '11 · Methodology trail',
    blurb: 'Every capture, transform and export is auto-logged per case — your reproducible methodology for the report.',
    points: [{ t: 'Review the Case Timeline to see exactly what you did and when.', to: '/timeline', toLabel: 'Case Timeline' }]
  },
  {
    id: 'report',
    icon: 'FileDown',
    title: '12 · Write & export the report',
    blurb:
      'Export a self-contained case report in the format you need. Evidence hashes and a chain-of-custody appendix make it defensible.',
    points: [
      { t: 'From an investigation → Report → choose HTML (interactive, searchable, with a location map and the link chart), Word (.docx), PDF, or Markdown.', to: '/projects', toLabel: 'Investigations' },
      { t: 'The HTML report is dark by default, has a live search box, embeds every image, and lists each exhibit’s SHA-256.' }
    ]
  },
  {
    id: 'keys',
    icon: 'KeyRound',
    title: 'API keys (optional)',
    blurb: 'Add keys to unlock enrichments. Keys are stored locally and never leave your machine except to that provider.',
    points: [
      { t: 'Hunter.io → company people/emails. Email Hippo → mailbox verification. Have I Been Pwned → breach membership. OpenAI → AI image geolocation. Plus VirusTotal, Shodan, IPinfo and more.', to: '/settings', toLabel: 'Settings → API keys' }
    ]
  },
  {
    id: 'backup',
    icon: 'Save',
    title: 'Backups & moving devices',
    blurb: 'GhostWire runs on Windows and Linux and your whole workspace is portable.',
    points: [
      { t: 'Settings → Backups: back up locally, or export a .gwpack with all data + media + settings and import it on another machine.', to: '/settings', toLabel: 'Backups' }
    ]
  },
  {
    id: 'opsec',
    icon: 'ShieldCheck',
    title: 'OPSEC reminders',
    blurb: 'A few habits that keep an investigation clean and your identity separate.',
    points: [
      { t: 'Always collect as a sock puppet through a VPN exit — never your real accounts or IP.' },
      { t: 'Capture as you go: if you didn’t hash-and-timestamp it, it didn’t happen. Re-verify exhibits before reporting.' },
      { t: 'Note the subject’s time zone and record your collection window — it matters for the report.' }
    ]
  }
]

export function Guide(): JSX.Element {
  const nav = useNavigate()
  const [active, setActive] = useState(SECTIONS[0].id)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { root, rootMargin: '-15% 0px -75% 0px' }
    )
    root.querySelectorAll('section[id]').forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  const jump = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-ink-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <BookOpen size={20} className="text-brand-glow" /> Guide — how GhostWire works
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">A full walkthrough of an investigation, tool by tool. Jump in anywhere.</p>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* TOC */}
        <nav className="w-64 shrink-0 border-r border-ink-700 overflow-y-auto py-3">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => jump(s.id)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 transition-colors ${
                active === s.id ? 'text-brand-glow bg-brand/10 border-r-2 border-brand' : 'text-slate-400 hover:bg-ink-800'
              }`}
            >
              <Icon name={s.icon} size={15} className={active === s.id ? 'text-brand-glow' : 'text-slate-500'} />
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl space-y-5">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="card p-5 scroll-mt-4">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <Icon name={s.icon} size={18} className="text-brand-glow" />
                  {s.title}
                </h2>
                <p className="text-sm text-slate-400 mt-1.5">{s.blurb}</p>
                <ul className="mt-3 space-y-2.5">
                  {s.points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                      <div className="flex-1">
                        <span>{p.t}</span>
                        {p.to && (
                          <button
                            className="ml-2 inline-flex items-center gap-1 text-xs text-brand-glow hover:underline align-middle"
                            onClick={() => nav(p.to!)}
                          >
                            {p.toLabel || 'Open'} <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <div className="text-center text-xs text-slate-600 pt-2 pb-8">
              That’s the whole loop. Start a case and work down the sidebar — and check What’s New for the latest features.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
