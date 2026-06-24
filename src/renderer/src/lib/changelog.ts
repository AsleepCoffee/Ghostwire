export interface ChangelogEntry {
  version: string
  date: string
  notes: string[]
}

/** In-app patch notes. Newest first. Keep in sync with CHANGELOG.md. */
export const CHANGELOG: ChangelogEntry[] = [
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
