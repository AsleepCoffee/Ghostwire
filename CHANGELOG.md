# Changelog

## v1.0.4
- DeHashed: fully corrected API integration — now uses POST to `/v2/search` with `Dehashed-Api-Key` header and JSON body (the old GET+Bearer format was wrong). Credit balance is fetched for free via `/v2/info/user` so the confirmation dialog always shows your real balance without spending a credit.

## v1.0.3
- DeHashed: fixed authentication — now uses Bearer token (v2 API). API key in Settings is just the raw key, no email prefix needed.
- DeHashed: Pivot modal now has a "Search API (1 credit)" button with the same credit-confirmation dialog, showing results inline without leaving the modal.

## v1.0.2
- DeHashed integration: email analysis now includes a real DeHashed credential search. Before running, GhostWire shows a confirmation dialog with your current credit balance and a clear "costs 1 credit" prompt. Results appear inline — database name, username, plaintext password, hashed password, IP, name, and address. Add your key in Settings → API keys.

## v1.0.1
- Tutorial: sidebar now highlights the active section with a ring and pulsing dot — no more blurred backdrop blocking the view.
- Tutorial: skill level picker on step 1 (New to OSINT / Some experience / Experienced). Beginners see an OSINT context box on each step explaining the investigative why behind every feature.
- Tutorial: "We noticed it's your first time here" greeting on first install.

## v1.0.0
- **Guided tutorial**: A step-by-step walkthrough launches automatically on first install and walks through every section of GhostWire — Investigations, Evidence Board, Graph Workspace, Case Timeline, Sock Puppets, Browser, Mailbox, Research Tools, VPN, and Settings. Relaunch it any time from Settings → Appearance → "Restart tutorial".
- GitHub releases now correctly publish as the latest release. CI promotion step updated to use the GitHub REST API directly for reliability.

## v0.1.143
- GitHub releases are now correctly published as the latest release instead of remaining as a draft/prerelease. The CI promotion step now uses the GitHub REST API directly for reliability.

## v0.1.122
- Fixed DOCX export — Word can now open exported .docx files (invalid margin attributes in the generated XML were causing Word to reject the file).
- DOCX export no longer embeds large screenshots inline; all text content, metadata, hashes, and chain of custody remain fully included. Use PDF or HTML for image-embedded reports.
- Report exports via the command palette (Ctrl+K) now respect saved branding, classification, and analyst settings.

## v0.1.121
- Link graph auto-selects the board tied to the active investigation and switches automatically when you change cases.
- Boards now require an investigation — the "create board" dialog enforces this and filters out archived cases.
- Archive investigations: cases can be archived and hidden in a collapsed "Archived" drawer on the Investigations page, and restored at any time.
- Delete investigations: permanent deletion requires typing the case name exactly in a confirmation dialog, clearly labelled as irreversible.

## v0.1.120
- Case-scoped tabs now require an active investigation: **Evidence Board**, **Case Timeline**, **Map** and **Notes** show a "create or open an investigation" prompt when none is active, instead of an empty/Unfiled view.
- Evidence dropped the "Unfiled" bucket — every exhibit belongs to a case. New notes are filed under the active investigation, with a one-click banner to file any previously-unfiled notes into it. The **Course Notes** (training) folder stays usable without a case.

## v0.1.119
- Welcome popup: shown on first launch and once after each update — pick your appearance mode (Standard vs GhostWire) and color theme up front.
- Customizable dashboard: an "Edit layout" toggle turns on in-place editing — drag the actual widgets to reorder them, resize each (Small / Medium / Wide), remove them, and use "+ Add widget" to add any of the available widgets. Layout is saved per appearance mode, for both Standard and GhostWire dashboards.

## v0.1.116
- GhostWire mode: the sidebar now has a macOS-dock-style proximity effect — nav items magnify and slide out as the cursor moves over them, with nearby items riding along.

## v0.1.115
- GhostWire mode: the sidebar keeps the small GhostWire icon at the top-left (only the "GhostWire / OSINT Workbench" text is dropped).

## v0.1.114
- Fixed PivotModal: the "select all by default" effect was keyed on the `queries` array identity, which is recreated on every parent re-render (e.g. the dashboard's 1s clock), so it kept resetting the selection and you couldn't un-tick lookups. Now keyed on a stable string of the query URLs — selection only resets when the actual query set changes.
- GhostWire mode: `.card`/Panel/modal surfaces across all pages get the glassy accent-tinted HUD treatment (`.ghost-mode .card`), matching the dashboard. Sidebar's small GhostWire/OSINT-Workbench header is hidden in GhostWire mode (h-16 spacer kept for alignment).

## v0.1.113
- GhostWire mode: the custom window title strip (`TitleBar`) is hidden and the window controls (minimize/maximize/close) move into the Topbar's top-right, so the top reads as one seamless glass pane (no divider, no duplicate GhostWire brand). The Topbar becomes the drag region (interactive controls marked no-drag).
- GhostWire mode: the active-investigation marker (Projects grid + ProjectDetail "Set active") uses a crosshair (`Target`) in theme accent instead of the amber star. Basic mode unchanged.

## v0.1.112
- GhostWire-mode Topbar: drops the bottom divider line, goes transparent over the backdrop, and the header row is centered (max-width, mx-auto). Basic mode keeps the bordered bar.
- Fixed the GhostDashboard "Appearance" footer shortcut — it's now a button that navigates to Settings (which opens on the Appearance section).

## v0.1.111
- GhostWire-mode sidebar restyled to match the command-center mockup: transparent over the backdrop (left gradient fade instead of a solid panel), uppercase letter-spaced line-icon items, group headings hidden for a flat list, and a glowing cyan active item (`.gw-nav-active`). Basic mode sidebar is unchanged.

## v0.1.110
- GhostWire mode polish: sidebar themed to the HUD (glassy panel, accent active items, monospace headings) when on; dashboard uses real app terms (Investigations, not "Cases"); the third top panel is now a real **Resources** module (Sock Puppets, Notes, VPN/connection status) instead of the placeholder "Operational Status".
- Basic mode now also shows the branded background image — particles remain exclusive to GhostWire mode. (`.app-backdrop` always rendered; `ParticleBackground` gated on `ghostMode`.)

## v0.1.109
- GhostWire mode gains a **command-center dashboard** (`GhostDashboard`): HUD panels (bracketed corners, glow, monospace labels) wired to live data — investigation status, case/entity/connection counts, UTC + local clock, top entities by frequency across all link charts, recent activity, a quick-pivot bar, command shortcuts, and tool tiles, layered over the animated backdrop + particles. The normal dashboard renders in Basic UI. `Dashboard` now chooses between `BasicDashboard` and `GhostDashboard` by `settings.ghostMode`.

## v0.1.108
- GhostWire mode now **defaults to off** (`settings.ghostMode === true` to enable) — the app opens in the clean Basic UI; the immersive backdrop + particles are opt-in via Settings → Appearance.

## v0.1.107
- **GhostWire mode** toggle (Settings → Appearance, `settings.ghostMode`, default on): switches between the immersive branded backdrop + animated particle network and a clean Basic UI. App.tsx gates the `.app-backdrop` and `ParticleBackground` on it.

## v0.1.106
- Animated particle-network backdrop (`ParticleBackground`) over the brand image — drifting nodes with proximity links in the live theme accent, on a `requestAnimationFrame` canvas. Honours `prefers-reduced-motion` and pauses on `visibilitychange`.

## v0.1.105
- Added the GhostWire branded background image (`src/renderer/public/ghostwire-bg.png`) behind the UI.

## v0.1.104
- Forensic captures now record the page's HTTP response — final status, full redirect chain, and response headers — into the hashed capture manifest (independent request at capture time via Electron `net.request`, so cookies/proxy apply).
- Document metadata for non-image evidence: PDFs (`/Info` + basic fields) and OOXML Word/Excel/PowerPoint (`docProps`) show embedded author/creator/dates/app in the evidence panel, alongside the existing image EXIF.
- **Verify all** in the Evidence locker re-hashes every exhibit and its forensic artifacts and reports overall integrity (OK / altered / missing).
- Optional branded app background — drop an image at `src/renderer/public/ghostwire-bg.jpg` and it shows faintly behind the UI.

## v0.1.103
- Clearer **Build from source** guide in the README — step-by-step prerequisites, clone, install, and build commands for Windows and Linux, so anyone can compile GhostWire themselves instead of trusting the prebuilt binary.
- Tidied up release notes and the build pipeline.

## v0.1.101
- Evidence locker accepts **any file type** (new `evidence:addFile` handler, hashed at ingest); non-image exhibits get a **View** button that opens them in the offline `file://` viewer (PDF/HTML/text/video/MHTML render in Chromium). Grid gains **type filter** (Screenshots/Images/Files) and **sort** (newest/oldest/title/type).
- **Verifiable releases**: the publish job now generates **`SHA256SUMS.txt`** of every asset and uploads it, and appends a "Verify your download" + "Build from source" footer (from `.github/RELEASE_FOOTER.md`) to every release's notes. README gained matching sections so users can check the binary's hash or self-compile.

## v0.1.100
- View forensic captures in-app: the Evidence panel's MHTML artifact now has a **View** button that opens the saved page archive in a full-screen offline viewer (a `file://`-loaded webview — Chromium renders MHTML reliably from disk). New `evidence:artifactFileUrl` handler + `mediaFileUrl` helper. Browse the exact captured page with no internet and no re-fetch.

## v0.1.99
- Archive re-verification: `evidence:verify` now re-hashes the forensic sidecar artifacts (MHTML archive + manifest) against their recorded SHA-256, not just the primary screenshot. `EvidenceVerify` gained a per-artifact `artifacts[]` result; Evidence detail shows each as "unaltered" / "MISMATCH — modified" / "file missing" so a captured page can be proven unchanged since collection.

## v0.1.98
- Complete forensic web capture. The full-page button now produces a defensible capture set as one exhibit: full-page PNG screenshot + a complete **MHTML page archive** (HTML + inlined resources, via CDP `Page.captureSnapshot`) + a **hashed manifest** (url, finalUrl, ISO timestamp, user-agent, page dimensions, per-artifact SHA-256). New `evidence:forensicCapture` handler; artifacts stored in a new `evidence.artifacts` column.
- Evidence detail lists forensic artifacts (size + SHA-256) with an **Export** button (`evidence:exportArtifact`) to save the `.mhtml`/manifest to disk and re-open the exact captured page. Artifact hashes now appear in HTML/PDF/Word reports and the chain of custody.

## v0.1.97
- Forensic full-page capture: new browser toolbar button screenshots the entire scrollable page via the Chrome DevTools Protocol (`Page.captureScreenshot` with `captureBeyondViewport`, height-capped at 25k px) and files it to evidence with source URL + capture time + SHA-256, then opens the annotate panel. New `browser:captureFullPage(webContentsId)` handler.
- OSINT bookmarks panel: optional toggleable sidebar in the browser with the curated course bookmark set (195 links / 12 categories, parsed from the imported `bookmarks_*.html` into `lib/bookmarks.ts`). Collapsible tree, type-to-filter, click to open in a new tab. Persisted via `settings.showBookmarks`.

## v0.1.96
- Report export options + professional deliverables. New export panel: toggle GhostWire branding, set "Prepared by"/Organisation, choose a classification. All formats (HTML/PDF/DOCX/MD) gain a cover (case reference `GW-XXXXXXXX-YYYYMMDD`, classification banner), an auto-generated **Executive summary**, **Scope & methodology**, and **Limitations & disclaimer** sections. Choices persist in settings (`reportOptions`). Threaded `ReportOptions` through preload → IPC → `gatherReport` → all three builders; unbranded omits the logo/name/footer.
- Domain Recon coverage: added urlscan.io, RapidDNS and Wayback Machine CDX sources, plus an active DoH brute of ~75 common subdomain names with wildcard-DNS detection (skips the brute when a wildcard is present to avoid false positives). Removed the dead Anubis source; raised the live-probe cap to 80 hosts.

## v0.1.95
- Release pipeline: stage as a **prerelease** instead of a draft. `gh release upload/view <tag>` 404s on drafts on the ubuntu runners (GitHub's `/releases/tags/{tag}` excludes drafts), which broke v0.1.94's Linux upload + publish steps. A prerelease is published (so it's found by tag on every runner) but is excluded from `/releases/latest` and ignored by electron-updater (`allowPrerelease` is false), so it stays invisible to auto-update until the publish job flips it to a full latest release. Carries all pending features (Domain Recon, add-to-investigation everywhere).

## v0.1.94
- Release pipeline rewritten to be deterministic. electron-builder no longer publishes at all (it kept creating duplicate drafts per tag and splitting assets — v0.1.92/93 each shipped a draft missing `latest.yml` and/or the `.exe`). Now `gh` creates one draft, both OS jobs build with `--publish never`, and every artifact is uploaded with `gh release upload` into that single draft; the publish job verifies `latest.yml` then un-drafts. Also set the NSIS `artifactName` to a hyphenated form so the on-disk installer name matches what `latest.yml` references. Includes all v0.1.92–93 features.

## v0.1.93
- Fixed the release pipeline. v0.1.92 built successfully but the publish job's safety net correctly refused to ship it: electron-builder running in both the Windows and Linux jobs nondeterministically created **two draft releases** for the tag (Windows assets + `latest.yml` on one, Linux on the other), and `gh release view` resolved to the Linux-only draft. Fix: only the Windows job publishes via electron-builder (into one draft, with `latest.yml`); the Linux job now builds with `--publish never` and **uploads its packages into that same draft via `gh release upload`**. One release object, deterministic. Includes all v0.1.92 features.

## v0.1.92
- "Add to investigation" everywhere — wired the shared `addToInvestigation` helper into the remaining research tools: Profile ID (username + social profile w/ numeric id), Proximity Search (located co-locations), Cross-Reference Images (shared-source hosts), Wireless/WiGLE (geolocated networks), and Account Finder (now records data points too, via the helper). Each pushes findings onto the active investigation's graph + known information, de-duped and auto-linked.

## v0.1.91
- New **Domain Recon** tool (`intel:reconDomain`, Research → Domain Recon). Automated passive recon equivalent to subfinder + assetfinder + amass (passive) + httprobe run together: aggregates subdomains from crt.sh, HackerTarget, AlienVault OTX, certSpotter and Anubis; adds DNS (A/MX/NS/TXT) + RDAP WHOIS; then probes every host (concurrency pool, https→http) for liveness, status, IP and page `<title>`. Results are pickable checkboxes that push selected hosts/IPs/emails/org onto the investigation graph + data points, anchored to the domain and auto-linked. No keys, no external binaries.
- New shared `lib/investigation.ts` helper (`addToInvestigation` / `addDataPoints`) — find-or-create the active investigation's board, de-dupe nodes, link to an anchor, auto-link, and record data points. 
- Reddit archive tool can now push findings into the case — "Add to investigation" / "Add all authors" buttons and a per-result "+ case" button add recovered usernames as graph nodes + known-information data points.

## v0.1.90
- Fixed auto-update properly. The v0.1.88 draft-flow change caused two draft releases per tag (one from `gh release create`, one from electron-builder); the publish job un-drafted the Linux-only one, so v0.1.88 and v0.1.89 shipped with **no `latest.yml`** → Windows update checks 404'd. Now electron-builder is the sole owner of a single draft (Windows job creates it, Linux job appends to it), the conflicting `gh` pre-create is removed, and the publish job **refuses to un-draft unless `latest.yml` is present** (safety net). Note: v0.1.88/0.1.89 GitHub releases remain missing their Windows assets; v0.1.90 onward are complete.

## v0.1.89
- New **Reddit archive** tool (Research → Reddit archive, or ⌘K). Recovers the original author of a deleted post/comment and a user's recent activity from PullPush + Arctic Shift (no API key). Thread mode resolves the OP even when Reddit shows `[deleted]` and lists recovered comment authors; Username mode pulls recent submissions/comments. Quick links to profile, Reveddit, and Camas. Backed by a new `intel:reddit(input, mode)` handler.

## v0.1.88
- Fixed auto-update "Cannot find latest.yml … 404" that happened when checking for updates mid-build. The release workflow now pre-creates the GitHub release as a **draft** (drafts aren't exposed as "latest", so electron-updater can't see a half-built release), builds/uploads Windows + Linux into it, then a final `publish` job flips it to published+latest only after both installers are up. `releaseType` is now `draft` in electron-builder config. The publish job runs if Windows succeeded even if Linux fails, so a flaky Linux build never blocks the Windows update.

## v0.1.87
- Google is the default search engine (address-bar queries and the Home button → Google; replaces DuckDuckGo).
- New tabs open blank (`about:blank`) with the address bar auto-focused and selected, like a normal browser. Blank tabs load nothing so the webview can't steal focus; the address bar shows empty and `toUrl` passes `about:` through.

## v0.1.86
- API services can carry an always-visible `hint` shown under their key input in Settings. Added a WiGLE hint: paste the long "Encoded for use" value (not the API Name or API Token alone); "API Name:API Token" with the colon also works.

## v0.1.85
- Browser session persists across restarts — open tabs (url + persona) and the active tab are saved to settings (`browserTabs`/`browserActiveIndex`) and restored on launch. A `sessionReady` gate prevents the restore render from overwriting the saved snapshot before the tabs commit.

## v0.1.84
- Add notes to screenshots — capturing a page/region or saving a page now opens an annotate panel (caption + notes) before filing. The evidence is saved first (returns an id), then `setTitle`/`setNote` enrich it, so dismissing the panel keeps the screenshot.

## v0.1.83
- Fixed: opening a new browser tab no longer blacks out the screen. The selector-highlight effect called `webview.executeJavaScript` against the just-mounted (not dom-ready) tab, which throws synchronously and escaped the effect, crashing the Browser component (same class of bug as the v0.1.23 Mailbox black screen). Now wrapped in try/catch; the did-finish-load handler re-runs it once the page is ready.
- Fixed: turning the app-wide VPN exit OFF now reliably reverts the in-app browser to your real / home IP. Root cause: clearing the exit sent `undefined` over IPC (dropped in transit), so the main process kept the old config; now cleared with `null`, which persists and resolves to a direct connection.
- Selectors are now per-investigation (keyed by active project) instead of one shared global list.
- New "Pull known info from case" button in the browser Selectors panel — seeds selectors from the active investigation's data points + subject + every entity label on its link charts.

## v0.1.82
- Hunchly-style selectors — define terms of interest; the in-app browser highlights matches on every page and shows a hit-count badge. Manage from the highlighter button in the browser toolbar (with an on/off toggle).
- Save page to investigation — bookmark button captures the current page (screenshot + URL + title) to the Evidence Board.

## v0.1.81
- Editable caption/title on evidence images (detail panel) — flows through to the report and map labels.
- Rename map pins — from the pin popup (Rename) or the evidence Geolocate panel.

## v0.1.80
- Maltego-style auto-linking — adding an entity from a search auto-connects it to related nodes already on the graph (email↔domain, subdomain↔domain, email↔username). New "Auto-link" button re-links any board on demand. Runs after every Add-to-chart.

## v0.1.79
- App-wide exit node is now a clear On/Off toggle (with a location picker when On) — Off = real/home IP, On routes the whole app through the chosen exit and starts that tunnel. Personas with their own exit still override it.

## v0.1.78
- Account Finder is now powered by the Sherlock engine — the bundled Sherlock site database (~480 sites) + its detection logic (status_code / message / response_url) run natively in the app (no Python). Live per-site results, add hits to the link chart.
- PhoneInfoga-style footprints in the phone pivot — WhatsApp (wa.me), Sync.me, NumLookup, WhoCalld, 800notes, plus reputation/social/leak Google dorks.

## v0.1.77
- New Wireless (WiGLE) tool — geolocate WiFi networks by SSID or BSSID via the WiGLE API, plotted on a map. Needs a free WiGLE token in Settings.
- Fixed turning the VPN off — stopping the global tunnel now re-applies proxies and reverts app-wide sessions to direct (real IP); previously vpn:stop didn't re-pin and left sessions on the dead SOCKS port. App-wide follows the global exit only while its tunnel is running (personas stay fail-closed).

## v0.1.76
- Themed Windows installer & uninstaller with a dark GhostWire sidebar.
- "Create a desktop shortcut" is now unchecked by default.

## v0.1.75
- Shodan API integration on the Domain & IP page — "Load verbose data" returns host org/ISP/ASN/OS, open ports + service banners, CVEs, tags and subdomains, with Shodan-facet pivots (org/ASN/product search, open host). Uses your Shodan key.
- Domain pivot adds DNSdumpster and Web Check (web-check.as93.net).
- Business pivots for organizations — OpenCorporates, AiHitData, Crunchbase, SEC EDGAR.
- Fix: turning off the global VPN exit reverts to the real IP immediately — proxy change now drops pooled keep-alive connections (forceReloadProxyConfig + closeAllConnections).

## v0.1.74
- Expanded website/domain pivots — grouped into Whois & DNS (Domain Dossier, ViewDNS whois/DNS/IP-history, DNSlytics, crt.sh), Tech & infra (BuiltWith, Shodan, urlscan, VirusTotal, Wayback) and Relationships (SpyOnWeb, BacklinkWatch, VisualPing). IP pivots add VirusTotal, DNSlytics reverse-IP, SpyOnWeb.

## v0.1.73
- Sock puppets get a LinkedIn account in their starter set (open-and-autofill for sign-up/login already wired).

## v0.1.72
- View Instagram without an account — username pivot adds Imginn (imginn.com profile/stories viewer) and a Google site:instagram.com dork.
- Profile ID tool (was "Facebook ID") now resolves Instagram too — numeric user ID ↔ username for Facebook or Instagram, via paste/resolve or "Grab from the open tab".

## v0.1.71
- New Facebook ID tool (Research) — resolve a Facebook profile's numeric user ID and vanity. Paste a URL/username, or "Grab from the open tab" to scrape it from a profile loaded in the in-app browser (works around FB's login wall). Copy/open actions + lookup-id.com fallback.

## v0.1.70
- Facebook search helpers in the person pivot — SowSearch (FB graph-search URL builder) and IntelX's Facebook tools tab.

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
