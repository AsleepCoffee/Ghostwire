# Changelog

## v0.1.17
- Update prompt: "Skip for now" is temporary again — re-checking (or the next launch) re-prompts to install.
- Fixed random-face avatars (old source stopped serving images) — now a real AI face with a fallback + clear error; plus Save-avatar-to-file for uploading to profiles.
- New Mailbox tab: log into your inbox to read catch-all alias mail; step-by-step setup guide when not configured.
- Quick Create uses your catch-all domain for the persona's email when set.
- Redesigned dashboard — cleaner, consistent layout.

## v0.1.16
- Custom themed window title bar — minimize / maximize / close now match your theme (frameless, draggable window).
- Quality pass (typecheck/build/boot, no stray debug or unthemed popups) and README refreshed for all current features.

## v0.1.15
- Export the investigation link chart as a PNG — fits the whole graph and lets you choose where to save it.
- Privacy note: the local database is intentionally not app-encrypted — a trial of OS-keystore encryption could fail to decrypt across launches (data-loss risk), so we recommend OS full-disk encryption (BitLocker) instead.

## v0.1.14
- Random AI-face avatars for personas — "Random face" in the editor, and auto-added on Quick Create.
- EXIF transform on image entities: pulls GPS into a location node and camera/date/software into properties.
- Per-investigation activity log — transforms, evidence captures and report exports are recorded as a methodology trail.

## v0.1.13
- Screenshot-to-evidence: a Capture button in the browser snapshots the page with its URL, a UTC timestamp and a SHA-256 hash, filed under the active investigation (pick it in the top bar).
- Investigation report export: one-click Markdown rollup of subject, known data, evidence (with hashes) and linked items.
- Catch-all email provider: set your own domain in Settings to give personas durable handle@yourdomain addresses alongside mail.tm.
- Persona accounts now track created vs. not-yet-made, with a created count and a clearer "open site to register/log in" action.
- Fixed the mail.tm "no domains available" error (now tries multiple domains).

## v0.1.12
- Sock puppets can generate a disposable mailbox (mail.tm) in one click, with a built-in inbox to read sign-up / verification emails.
- New graph transform: live username enumeration — probes major platforms and adds only the accounts that actually exist.
- New free domain transforms: DNS A-record resolve and latest Wayback Machine snapshot (no key needed).

## v0.1.11
- Transforms now work like Maltego — they pull entities & data straight INTO the graph and never just open a browser tab. (Opening web tools is the separate "Pivot" action.)
- Transform results de-duplicate: repeat runs link to existing nodes instead of piling up duplicates.
- Entity types with no data transform now point you to Pivot instead of showing tab-openers.
- Added a Hunter "verify email" transform (deliverability/score onto the email).

## v0.1.10
- API-powered graph transforms — pull real data straight into the link chart: VirusTotal (subdomains, resolved IPs, domains-on-IP), Shodan (ports/hostnames/org), Hunter (emails on a domain), AbuseIPDB (reputation).
- Right-click any graph node for a menu: run transforms, pivot, or add to notes.
- Fixed the update prompt showing a stale "downloading" after you click Skip.
- The app version now shows at the bottom-left of the sidebar.

## v0.1.9
- Pivots now surface every API tool you hold a key for, deep-linked to the right result page per data type (email, domain, IP, username, phone…).
- From the graph, a node now has Pivot and "Add to notes" — drop findings straight into the investigation's notes.
- Removed the duplicate "Resources" sidebar item (Tools & Resources already covers it).

## v0.1.8
- Investigations now hold structured "Known information" (emails, usernames, domains, IPs, …) you can capture on create or in the detail view.
- Pivot on any data point, or add it to the investigation's link chart in one click; "Build link chart" seeds the whole board at once.
- Pivots now include your keyed API tools (VirusTotal, Shodan, urlscan, etc.) for the relevant data type — building toward a Maltego-style flow.
- Fixed Censys Platform token (censys_…) validation — now uses the correct Platform API endpoint.

## v0.1.7
- Fixed the urlscan.io key test (now uses the search API endpoint, not the non-API quota route).
- Censys now accepts a Platform token (Bearer) as well as legacy "API ID:Secret".
- API keys are cleaned of stray quotes/whitespace before use.

## v0.1.6
- Course Notes can now be toggled on/off on its own; Resources is always shown (just above Settings).
- API key tests now show the provider's actual HTTP status when a key is rejected.
- Censys testing clarified — enter your key as "API ID:Secret".
- Added in-app patch notes and release notes on every GitHub release.

## v0.1.5
- Paid API integrations are now in their own "Subscription required" subsection, separate from free ones.

## v0.1.4
- API keys split into Free-tier and Paid sections.
- New "API Integrations" tools that stay locked until you add the matching key.
- Per-key Test button reworked with valid / invalid / error / untestable states; added a Censys test.

## v0.1.3
- 9 genuinely distinct themes that reskin the whole app (backgrounds, top bar, dialogs).
- All popups are now themed in-app dialogs (no more native confirm boxes).
- Update prompt with "Install" / "Skip for now", then "Restart & install".
- Added a Test button for API keys.

## v0.1.2
- Maltego-style transforms in the graph (crt.sh subdomains, IPinfo enrichment, profile expansion).
- Dashboard "Quick Start" pivot launcher.
- Installer now prompts to create a desktop shortcut.

## v0.1.1
- Auto-updates from GitHub releases and a one-click Windows installer.

## v0.1.0
- First release: sock puppet manager with isolated sessions, tabbed browser, OSINT tool launcher, entity graph, notes with Obsidian export, and investigations.
