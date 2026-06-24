# Changelog

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
