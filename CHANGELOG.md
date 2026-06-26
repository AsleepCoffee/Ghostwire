# Changelog

## v0.1.69
- View/search X/Twitter without an account — username pivot adds a Nitter front-end (xcancel: profile + the handle's tweets), Sotwe, and a Google site:x.com dork.

## v0.1.68
- Voter & public-records lookups in the person pivot — VoterRecords (deep-linked) plus Google dorks for voter registration and county/public records. (VoterRecords is Cloudflare-protected and blocks VPN/datacenter exits; use a residential IP.)

## v0.1.67
- Many more people-search options in the name/person pivot set — TruePeopleSearch, FastPeopleSearch, FastBackgroundCheck, WhitePages, 411, Spokeo, That'sThem, WebMii, PeekYou, Radaris, Nuwber, ZabaSearch, AdvancedBackgroundChecks, Pipl — each deep-linked to the name. Pivot a person/name (e.g. a person node on the graph) → "People search".

## v0.1.66
- Quick username-aggregator links on the Account Finder (and in the username Pivot set) — WhatsMyName, NameChk, NameCheckup. Each copies the username to your clipboard and opens the site to paste (these SPAs have no reliable deep link).

## v0.1.65
- Added a visible "Jump to… ⌘K / Ctrl K" button in the top bar so the command palette is discoverable (click or use the shortcut).

## v0.1.64
- New Guide (top of the sidebar / Cmd-K) — a full tool-by-tool walkthrough of how GhostWire works, following the investigation loop, with a table of contents and "Open" jump buttons to each feature.

## v0.1.63
- Free breach lookups (no key) on every email analysis — LeakCheck (which breaches an address is in: sources, dates, leaked field types) and Hudson Rock (info-stealer infection exposure). Like a free DeHashed-style breach view.

## v0.1.62
- Email verification via Email Hippo — the email analysis now checks whether the mailbox exists (deliverable / doesn't exist / risky) with a trust score and disposable/role/free/catch-all flags, and each address found in a Company (Hunter) lookup has a one-click Verify. Add an Email Hippo API key in Settings → API keys.

## v0.1.61
- Company lookup via Hunter.io (Email & Phone Intelligence → Company) — enter a company name or domain to get its people/emails (name, role, department, seniority, confidence, LinkedIn) and the org's email pattern. Copy/pivot any address or add the whole company to the link chart. Uses the Hunter.io API key from Settings.

## v0.1.60
- New Proximity Search (Research) — find every place where two things sit within a chosen distance of each other (e.g. a Westin within 150 m of a Wendy's) across a country/state/city, via OpenStreetMap (Nominatim + Overpass). Results show distances, plot on a map, and offer Street View / Map / copy-coords per hit. Useful for narrowing a location from landmarks visible in a photo.

## v0.1.59
- Click an evidence image to open it full-screen — toggle actual-size/fit to zoom in for a closer look (Esc or click to close).
- HTML report link-analysis chart redesigned to match the in-app graph — dark rounded cards with type-coloured borders and embedded entity thumbnails, instead of plain white boxes.

## v0.1.58
- Remove a pin from the Map — a pinned evidence location's popup now has a "Remove pin" action that clears its location and takes it off the map.
- Fixed release publishing — electron-builder's concurrent artifact uploads were racing to create the GitHub release (422 "tag_name already_exists"), which randomly left releases missing the `.exe`/Linux assets. The workflow now pre-creates the release before publishing, so all artifacts upload reliably; the release-notes step is also resilient.

(v0.1.57 was never fully published due to that race and is superseded by this release.)

## v0.1.56
- Fixed the in-app browser reloading pages on its own — the webview's `src` was bound to the live, navigation-updated URL, so every redirect rewrote `src` and forced another load (looping on challenge/redirect pages). `src` is now a stable initial URL; navigation only drives the address bar.
- Restored the Linux build — the release-notes step (`gh release edit`) was 422-ing under electron-builder 26, failing the Windows job and skipping the dependent Linux job. The step now patches the release body by ID and is `continue-on-error`, so both platforms always build.

## v0.1.55
- Fixed pages constantly refreshing / the URL endlessly changing in the in-app browser — the browser now presents a consistent desktop-Chrome identity (User-Agent matches the Sec-CH-UA client hints), so Google/Cloudflare stop looping bot checks. (Replaces the v0.1.53 hardcoded UA, which mismatched the client hints.)
- Security: upgraded to Electron 42 + electron-builder 26 (npm vulnerabilities 13 → 3, remaining are dev-only build tooling). CI actions bumped to the Node 24 runtime.
- Map pins now have a "Street View" link that opens Google Street View at that location, in-app.
- HTML report: every photo carries its "Exhibit N" badge so map pins / custody rows match the right image.

## v0.1.54
- New Cross-Reference Images tool (Research) — reverse-search several images, grab the result links from the open tab, and pages/boards/profiles appearing across multiple images are ranked, surfacing a likely shared source.
- Removed the automatic image-upload injection (it destabilised the browser); reverse image search is copy-to-clipboard + the pinned paste panel.
- Manually set an evidence location (lat/lng + label).
- HTML report overhaul — GhostWire logo, live full-report search, dark by default, Location Map with tiles that load from disk (Carto), full per-photo metadata, and a fixed link-analysis chart.
- Added confirmation prompts for deleting a VPN config and restoring a backup from a folder.

## v0.1.53
- Reverse image search reworked — copies the image to the clipboard, opens the engine in-app, and pins the image in a side panel to re-copy/paste (Ctrl+V). Reliable across Lens/Yandex/Bing/TinEye/PimEyes.
- Fixed pages stuck reloading / the URL endlessly changing — Google (Maps/Street View/Earth/Lens) and Cloudflare-protected sites rejected the Electron User-Agent and looped. The in-app browser now presents a normal desktop-Chrome UA.
- Reports include full photo info — camera/EXIF, capture time, GPS, OCR text and all metadata — plus a Location Map with a pin per geolocated exhibit. HTML report is dark mode by default.
- Street View / Google Earth buttons enable once a location is pinned.

## v0.1.52
- Reverse image search now uploads your image — Lens/Yandex/Bing/TinEye/PimEyes open in-app and the saved image is dropped into the engine's upload box (also copied to clipboard as a Ctrl+V fallback). No public URL needed.
- New Geolocate panel on every image exhibit — pin a location on the case Map from EXIF GPS, an AI guess, or by hand; quick links to Street View, Google Earth, SunCalc. Pinned locations plot on the Map.
- AI image geolocation (optional, OpenAI key) — analyzes a photo's visual cues and returns ranked candidate locations you can pin. Add the key in Settings → API keys.

## v0.1.51
- Everything stays in the app — links, pivots, search engines, photo GPS locations, context-menu actions and pop-ups (target=_blank/window.open) now always open in the in-app browser, never the system browser.
- Fixed a runaway loop where some embedded pages (e.g. Google Lens) could spawn tabs endlessly — repeated/rapid opens are de-duplicated and rate-limited.

## v0.1.50
- Fixed OCR in the installed app — "Run OCR" failed with "Only absolute URLs are supported" because tesseract tried to fetch the bundled language model over the network (its worker reports an `electron` environment). The model is now decompressed straight into the cache and read from disk, so OCR works offline on Windows and Linux.

## v0.1.49
- Chain of custody — every exhibit has a "Verify integrity" check that re-hashes the stored file against the SHA-256 recorded at capture (verified / altered / missing), shown in a dedicated custody panel. Legacy exhibits are hashed on first check.
- Reports, reimagined — export as an interactive HTML deliverable (sidebar nav, click-to-zoom evidence, dark-mode toggle, copy-hash, chain-of-custody appendix), an editable Word (.docx), a print-ready PDF, or Markdown — chosen from the Report menu.

## v0.1.48
- New Domain & Infrastructure Intelligence (Research) — for a domain: WHOIS, full DNS (A/MX/NS/TXT/CNAME), crt.sh subdomains and hosting org/geo; for an IP: organization, ASN, location, network and reverse DNS. One-click add-to-chart and pivots. No API key required.
- OCR now works fully offline — the English text model ships with the app, so "Run OCR" no longer needs an internet connection.

## v0.1.47
- OCR on evidence — "Run OCR" on any image extracts its text (saved, copyable, appendable to the note).
- Evidence search — filter the board by title, source, notes and OCR text.

## v0.1.46
- New Email & Phone Intelligence (Research) — email: Gravatar profile + linked accounts, MX check, Have I Been Pwned breach lookup (needs a HIBP key); phone: country, line type, formats via libphonenumber. Pivot or add findings to the link chart. Added a HIBP API key in Settings.
- Map-based time-zone picker — "Map" button on an investigation's Time zone field and the dashboard Add-clock resolves the zone from a clicked location (offline).

## v0.1.45
- Linux support — releases now include an AppImage and a .deb (auto-update on AppImage), alongside the Windows installer.
- Portable export/import — Settings → Backups → Export to file makes a `.gwpack` with all data + media + settings; Import restores it on any platform and restarts.

## v0.1.44
- Multi-engine search — Dork builder + pivots run across Google, Bing, DuckDuckGo, Yandex, Brave, Startpage, Mojeek, Baidu, Yahoo.
- Pivots open in the in-app browser by default and run as the active investigation's assigned sock puppet (using its VPN exit); system browser is a secondary option.
- App-wide VPN exit — route the whole app (browsing, lookups, transforms, downloads, mail) through one exit (Settings → VPN). A persona's own exit overrides; fails closed.

## v0.1.43
- Evidence shows the full metadata dump — every embedded EXIF/GPS/IPTC/XMP tag, file size, GPS map link, and Copy all. Pairs with right-click → Add image to evidence in the browser.

## v0.1.42
- New Map view — plots location entities + photo GPS; named places geocoded via OpenStreetMap; filter by investigation.
- Right-click images in the in-app browser → Add image to evidence (SHA-256 + EXIF), reverse image search, copy/open. Full right-click menu (copy/paste, link & selection actions) added to the browser.

## v0.1.41
- Command palette (Ctrl/⌘+K) — jump to any page/investigation/persona/tool and export the active investigation's report.
- Graph intelligence — find/highlight nodes, Tidy (auto-arrange by type), and Merge duplicates.
- Per-persona fingerprint hardening — stable, unique UA/canvas/WebGL/hardware per sock puppet (toggle in Settings → VPN).
- New PORP Exam Prep page (Training) — requirements, methodology checklist, and a one-click report template.

## v0.1.40
- Multi-select in the graph — toggle Pan/Select to box-select nodes, or shift-click to add; move the selection together (saved) or Delete them all at once.

## v0.1.39
- Dashboard world clocks — set a Time zone on an investigation (editor) and the dashboard shows a live clock for it beside local time (investigations with a zone appear automatically, active first).
- "Add clock" on the dashboard pins any time zone alongside local time.
- Reorganized the sidebar into sections — Investigation, Identities, Research.

## v0.1.38
- Fixed the active-investigation picker (top bar) not listing newly created investigations / showing blank when set — now refreshes live (on navigation, focus, and project changes). Set active also available from the investigation page and each card's star.
- Unlink in the graph — double-click a link to remove it, or select + Delete/Backspace (persisted). Keyboard node deletion persists too.
- Attach an image to any graph entity from the Evidence Board (or upload) via the entity panel.
- Split the right-side dock into two separate pop-outs: Persona and Investigation, each with its own edge tab.

## v0.1.37
- New Account Finder — check a username across every major platform at once with live found/not-found/unclear status; open hits or select them and drop them onto a link chart (linked to a username node).
- New Case Timeline — chronological, day-grouped view of everything done on an investigation, filterable by action type.

## v0.1.36
- Case report export — Investigation → Report → PDF / HTML / Markdown. PDF & HTML bundle a visual link-chart (SVG), evidence (images + source + SHA-256), notes, personas and the activity timeline into one shareable file.
- Active investigation — star one to make it active (highlighted); browser captures and evidence file into it automatically.
- Investigation dock — the right-side slide-out now also shows the active investigation (subject, known data points, objectives, background) with a Persona/Investigation tab switch.
- Region screenshots in the in-app Browser — click the camera and drag a box (or "Full visible"); lands in the Evidence Board.
- Evidence reverse image search now opens in the in-app browser.

## v0.1.35
- Open links straight from the graph — double-click an entity (or right-click → Open link) to open its URL in the in-app browser, plus an "Open in system browser" option. Works for social/profile, document, domain (→ https) and location (→ map) nodes.

## v0.1.34
- New Evidence Board (sidebar) — a per-investigation media locker. Drag images from the desktop, paste screenshots (Ctrl+V), or paste an image URL; each is saved with a capture time and SHA-256 hash.
- Per-item: source, timestamp, copyable SHA-256, EXIF (GPS → map pin, camera/date), one-click reverse image search (Google Lens/Yandex/Bing/TinEye/PimEyes), add-to-link-chart, save copy, and notes.
- Screenshots captured from the in-app Browser land here automatically under the active investigation.

## v0.1.33
- New live Transform Log on the link chart — every transform shows its status (running, +N nodes, nothing new, needs a key, or failed with the exact error). Click an entry to jump to that entity; clear/collapse anytime.
- Hunter results are clearer: email verification reports result, score, SMTP and MX checks; domain-email lookup reports the count found.

## v0.1.32
- Maltego-style "Run all transforms" — right-click a graph node (or use the entity panel) to fire every available transform at once and pull all results in as connected nodes. Skips transforms missing an API key, dedupes across the whole batch, reports nodes added.
- Transform engine reviewed end-to-end (network layer, dedupe, edge/prop writes, activity log).

## v0.1.31
- X/Twitter accounts open in your system browser instead of the in-app browser — X spawns popup windows during sign-up that can't survive in an embedded view. The persona stays pinned to the dock for copy-paste.
- Pivots default to opening in your system browser — many lookup sites (LinkedIn, social profiles, Truecaller, PimEyes, …) block embedding and failed to load in app tabs. "In-app tabs" remains as a secondary option for persona-session lookups.

## v0.1.30
- Autofill is disabled entirely on X/Twitter — its sign-up is too fragile to script, so GhostWire leaves it alone (use the Persona Dock to copy details). Stops the glitching when clicking Continue.
- Marking a sock-puppet account as created/validated now saves immediately — the status sticks without hitting Save.

## v0.1.29
- Fixed autofill breaking complex sign-ups (notably X/Twitter). Autofill is now gentle: each field is filled once, it never steals focus, it leaves fields you've started typing in alone, and it stops quickly rather than fighting a re-rendering page. The 🔑 button re-fills the current step on demand.

## v0.1.28
- Fixed X/Twitter (and other) sign-ups demanding a Windows security key / passkey — passkey prompts are disabled inside the in-app browser so sites fall back to normal password sign-up.
- Generated usernames are valid on Reddit, X and Discord — dots are stripped (those platforms don't allow them).
- X/Twitter sign-up opens on the current x.com flow.

## v0.1.27
- New Backups (Settings → Backups): pick a folder and back up everything (DB + evidence/avatar media). On-demand backup, optional daily auto-backup, and one-click restore (the app restarts into the restored data). Keeps the latest 15 backups.
- VPN exits are auto-named by location — imported Proton configs show their country (e.g. "United States · US-NY#1") so it's obvious which exit to assign to which persona.

## v0.1.26
- One-click VPN engine install — the VPN tab downloads and sets up the wireproxy helper for you automatically (no archives, PATHs, or folders to fuss with).
- Clearer Proton setup — the guide now states exactly what to pick on Proton's WireGuard page (Platform: GNU/Linux, Moderate NAT off, NAT-PMP off, VPN Accelerator on, pick a country, Create).
- The pinned Persona Dock updates instantly when you edit and save a sock puppet.
- Generated avatars no longer carry the small "this person does not exist" watermark — cropped off, and a clean source is preferred.

## v0.1.25
- New Persona Dock — a pinnable side panel that keeps a sock puppet's details and account credentials visible across every tab (including the in-app Browser), so you can copy-paste into sign-up forms without losing the card. Pin from a persona's 📌 button, or it opens automatically when you launch a sign-up/login.
- Copy buttons now actually copy — switched to the OS clipboard (the web Clipboard API is blocked in the packaged file:// app).
- Sign-up autofill is more thorough — keeps filling fields that appear on later steps of multi-step registration wizards, not just the first screen.
- Mailbox no longer pops out a separate window when signing into webmail — the login stays inline so auto sign-in can fill it.

## v0.1.24
- Sock puppet accounts now open the real sign-up page (not login) when the account hasn't been created yet, so the persona's details autofill on the registration form. Once marked "created", the button opens the login page instead.
- New click-to-copy Identity panel in the persona editor — copy any detail (name, first/last, username, email, phone, birthday + split day/month/year, age, gender, location, nationality) individually or all at once, for sites where autofill misses fields.

## v0.1.23
- Fixed the Mailbox tab showing a black screen — the new auto-fill could crash the view if it ran before the webmail page was ready. It now fails safely and retries once the page loads.

## v0.1.22
- Mailbox auto sign-in now fills the password on the second Google/Microsoft step — it watches the page for the password box appearing after you pick the account, instead of only filling once on load. Still backed by the 🔑 manual fill button.
- Settings now uses the full window width instead of a narrow centered column.

## v0.1.21
- Mailbox auto sign-in is much more reliable — it keeps filling email + password as the login advances (Gmail/Microsoft reveal the password box on a second step), plus a 🔑 fill-on-demand button. The webmail view uses a real desktop browser identity to avoid "insecure browser" blocks.
- Per-persona VPN exits: import Proton WireGuard configs and route each sock puppet through a different country (userspace via wireproxy, no admin rights). Manage tunnels in Settings → VPN or the VPN tab; sessions are fail-closed and WebRTC is locked to the proxy.
- Fixed an upgrade issue where older databases were missing the new nationality/phone persona columns.

## v0.1.20
- Redesigned the dashboard into a proper command center — hero with a live ops clock, time-aware greeting, animated grid + glow backdrop, and a one-click "Resume" for your most recent investigation.
- Premium stat cards and tool/action tiles with lift, glow-ring, and a sweeping sheen on hover; list rows highlight with an accent edge and animated chevrons.
- New app-wide motion & polish layer (gradient text, glass surfaces, fade-up entrances) that follows the active theme and respects "reduce motion".

## v0.1.19
- Persona autofill now fills sign-up forms, not just logins — opening a site for a persona auto-populates first/last name, email (+ confirm), username, password (+ confirm), birthday, gender, and phone. Tuned for Facebook and generic registration pages; the 🔑 button re-fills on demand.
- Quick Create can target a country (US, UK, Canada, Australia, Ireland, Germany, France, Netherlands, or Any) — location, nationality, and phone are generated to match.
- Mailbox: optionally store the receiving account's password so GhostWire re-fills its webmail login automatically if you get signed out.
- Dates now display as Day Month Year (e.g. 25 Jun 2026) throughout; reports use a clear timestamped format with timezone.

## v0.1.18
- Disposable persona mailboxes are far more reliable — falls back from mail.tm to mail.gw when one provider runs out of domains, so persona email creation rarely fails. Read these right in the app from a persona's Inbox.
- Clarified the two ways to receive mail: per-persona disposable inboxes (read natively in-app) vs. a catch-all domain forwarding to one account read in the Mailbox tab.
- Mailbox setup guide now recommends a dedicated receiving account (e.g. a throwaway Gmail) instead of your personal inbox, and explains the catch-all → webmail flow more clearly.

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
