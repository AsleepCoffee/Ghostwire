export interface ChangelogEntry {
  version: string
  date: string
  notes: string[]
}

/** In-app patch notes. Newest first. Keep in sync with CHANGELOG.md. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.1.12',
    date: '2026-06-24',
    notes: [
      'Sock puppets can generate a disposable mailbox (mail.tm) in one click, with a built-in inbox to read sign-up / verification emails.',
      'New graph transform: live username enumeration — probes major platforms and adds only the accounts that actually exist.',
      'New free domain transforms: DNS A-record resolve and latest Wayback Machine snapshot (no key needed).'
    ]
  },
  {
    version: '0.1.11',
    date: '2026-06-24',
    notes: [
      'Transforms now work like Maltego — they pull entities & data straight INTO the graph and never just open a browser tab. (Opening web tools is the separate “Pivot” action.)',
      'Transform results de-duplicate: repeat runs link to existing nodes instead of piling up duplicates.',
      'Entity types with no data transform now point you to Pivot instead of showing tab-openers.',
      'Added a Hunter “verify email” transform (deliverability/score onto the email).'
    ]
  },
  {
    version: '0.1.10',
    date: '2026-06-24',
    notes: [
      'API-powered graph transforms — pull real data straight into the link chart: VirusTotal (subdomains, resolved IPs, domains-on-IP), Shodan (ports/hostnames/org), Hunter (emails on a domain), AbuseIPDB (reputation).',
      'Right-click any graph node for a menu: run transforms, pivot, or add to notes.',
      'Fixed the update prompt showing a stale “downloading” after you click Skip.',
      'The app version now shows at the bottom-left of the sidebar.'
    ]
  },
  {
    version: '0.1.9',
    date: '2026-06-24',
    notes: [
      'Pivots now surface every API tool you hold a key for, deep-linked to the right result page per data type (email, domain, IP, username, phone…).',
      'From the graph, a node now has Pivot and “Add to notes” — drop findings straight into the investigation’s notes.',
      'Removed the duplicate “Resources” sidebar item (Tools & Resources already covers it).'
    ]
  },
  {
    version: '0.1.8',
    date: '2026-06-24',
    notes: [
      'Investigations now hold structured “Known information” (emails, usernames, domains, IPs, …) you can capture on create or in the detail view.',
      'Pivot on any data point, or add it to the investigation’s link chart in one click; “Build link chart” seeds the whole board at once.',
      'Pivots now include your keyed API tools (VirusTotal, Shodan, urlscan, etc.) for the relevant data type — building toward a Maltego-style flow.',
      'Fixed Censys Platform token (censys_…) validation — now uses the correct Platform API endpoint.'
    ]
  },
  {
    version: '0.1.7',
    date: '2026-06-24',
    notes: [
      'Fixed the urlscan.io key test (now uses the search API endpoint, not the non-API quota route).',
      'Censys now accepts a Platform token (Bearer) as well as legacy "API ID:Secret".',
      'API keys are cleaned of stray quotes/whitespace before use.'
    ]
  },
  {
    version: '0.1.6',
    date: '2026-06-24',
    notes: [
      'Course Notes can now be toggled on/off on its own; Resources is always shown (just above Settings).',
      'API key tests now show the provider’s actual HTTP status when a key is rejected.',
      'Censys testing clarified — enter your key as “API ID:Secret”.',
      'Added in-app patch notes (this panel) and release notes on every GitHub release.'
    ]
  },
  {
    version: '0.1.5',
    date: '2026-06-24',
    notes: ['Paid API integrations are now in their own “Subscription required” subsection, separate from free ones.']
  },
  {
    version: '0.1.4',
    date: '2026-06-24',
    notes: [
      'API keys split into Free-tier and Paid sections.',
      'New “API Integrations” tools that stay locked until you add the matching key.',
      'Per-key Test button reworked with valid / invalid / error / untestable states; added a Censys test.'
    ]
  },
  {
    version: '0.1.3',
    date: '2026-06-24',
    notes: [
      '9 genuinely distinct themes that reskin the whole app (backgrounds, top bar, dialogs).',
      'All popups are now themed in-app dialogs (no more native confirm boxes).',
      'Update prompt with “Install” / “Skip for now”, then “Restart & install”.',
      'Added a Test button for API keys.'
    ]
  },
  {
    version: '0.1.2',
    date: '2026-06-24',
    notes: [
      'Maltego-style transforms in the graph (crt.sh subdomains, IPinfo enrichment, profile expansion).',
      'Dashboard “Quick Start” pivot launcher.',
      'Installer now prompts to create a desktop shortcut.'
    ]
  },
  {
    version: '0.1.1',
    date: '2026-06-24',
    notes: ['Auto-updates from GitHub releases and a one-click Windows installer.']
  },
  {
    version: '0.1.0',
    date: '2026-06-24',
    notes: [
      'First release: sock puppet manager with isolated sessions, tabbed browser, OSINT tool launcher, entity graph, notes with Obsidian export, and investigations.'
    ]
  }
]
