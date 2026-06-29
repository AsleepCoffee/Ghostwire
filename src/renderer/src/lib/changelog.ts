export interface ChangelogEntry {
  version: string
  date: string
  notes: string[]
}

/** In-app patch notes. Newest first. Keep in sync with CHANGELOG.md. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.1.111',
    date: '2026-06-29',
    notes: ['GhostWire-mode sidebar restyled to match the command-center look — transparent over the backdrop, uppercase line-icon items, and a glowing cyan active state.']
  },
  {
    version: '0.1.110',
    date: '2026-06-29',
    notes: [
      'GhostWire mode polish — the sidebar is now themed to match the HUD, the dashboard uses the app’s real terms (Investigations, not “Cases”), and the top-right panel shows real resources (Sock Puppets, Notes, connection status) instead of a placeholder.',
      'Basic mode now keeps the branded background image too — just without the moving particles (those stay exclusive to GhostWire mode).'
    ]
  },
  {
    version: '0.1.109',
    date: '2026-06-29',
    notes: ['GhostWire mode now has a full command-center dashboard — HUD panels with your live data: investigation status, case/entity/connection counts, a UTC clock, top entities by frequency, recent activity, a quick-pivot bar, and tool tiles, over the animated backdrop. (Basic UI is unchanged.)']
  },
  {
    version: '0.1.108',
    date: '2026-06-29',
    notes: ['GhostWire mode now defaults to off — the app opens in the clean Basic UI; turn on the immersive backdrop + particles in Settings → Appearance.']
  },
  {
    version: '0.1.107',
    date: '2026-06-29',
    notes: ['New “GhostWire mode” toggle in Settings → Appearance — switch between the immersive branded backdrop + animated particles and a clean Basic UI.']
  },
  {
    version: '0.1.106',
    date: '2026-06-28',
    notes: ['Animated particle network behind the app — drifting nodes that link up, in your theme’s accent colour. Respects “reduce motion” and pauses when the window is hidden.']
  },
  {
    version: '0.1.105',
    date: '2026-06-28',
    notes: ['New GhostWire branded background behind the app.']
  },
  {
    version: '0.1.104',
    date: '2026-06-28',
    notes: [
      'Forensic capture now records the page’s HTTP response — the final status code, full redirect chain, and response headers (server, content-type, etc.) — into the hashed capture manifest, so the network response is part of the evidence record.',
      'Document metadata for evidence files — PDFs and Word/Excel/PowerPoint files now show their embedded author, creator, dates and app info in the evidence panel (the same way images show EXIF). Great for spotting who really made a document.',
      '“Verify all” button in the Evidence locker re-hashes every exhibit and its forensic artifacts in one pass and reports overall integrity (how many are unaltered vs. changed/missing).',
      'Optional branded background image for the app.'
    ]
  },
  {
    version: '0.1.103',
    date: '2026-06-28',
    notes: [
      'Clearer “Build from source” guide — the README now walks through compiling GhostWire yourself step by step (prerequisites, clone, install, build) for Windows and Linux, and release notes have been tidied up.'
    ]
  },
  {
    version: '0.1.101',
    date: '2026-06-28',
    notes: [
      'Evidence locker handles any file type — drag in PDFs, documents, video, anything; non-image files get a “View” button that opens them in the in-app offline viewer. Filter the grid by type (Screenshots / Images / Files) and sort by newest, oldest, title, or type.',
      'Verifiable releases — every release now ships a SHA256SUMS.txt of all files, and the release notes include exact steps to verify your download’s hash and to build GhostWire yourself from source. Added a “Verify your download” and “Build from source” section to the README too.'
    ]
  },
  {
    version: '0.1.100',
    date: '2026-06-28',
    notes: [
      'View captured pages in-app — forensic captures now have a “View” button in the Evidence panel that opens the saved MHTML archive in a full-screen offline viewer, so you can browse the exact captured page (no internet, no re-fetch) without exporting it first.'
    ]
  },
  {
    version: '0.1.99',
    date: '2026-06-28',
    notes: [
      'Verify the whole forensic capture — “Verify integrity” on an exhibit now re-hashes the MHTML page archive and manifest too (not just the screenshot) and shows a per-artifact unaltered / MISMATCH result, so you can prove a captured page hasn’t changed since collection.'
    ]
  },
  {
    version: '0.1.98',
    date: '2026-06-28',
    notes: [
      'Forensic web capture, complete — the full-page button now also saves a complete MHTML archive of the page (HTML + inlined resources) plus a hashed capture manifest (URL, final URL, timestamp, user-agent, dimensions, SHA-256 of every artifact), all filed as one exhibit. This is a defensible, court-style web capture.',
      'Evidence detail now lists each exhibit’s forensic artifacts with their sizes and SHA-256 hashes, and an Export button saves the MHTML archive (or manifest) to disk so you can re-open the exact page later. Artifact hashes are included in all report formats and the chain of custody.'
    ]
  },
  {
    version: '0.1.97',
    date: '2026-06-28',
    notes: [
      'Forensic full-page capture — a new button in the browser toolbar screenshots the ENTIRE scrollable page (not just the visible part) and files it to the investigation with its source URL, capture time and SHA-256 integrity hash, then prompts for a caption/notes.',
      'OSINT bookmarks panel — toggle a curated bookmarks sidebar in the browser (195+ OSINT sites across Company, Internet Scan, Email, Phone, People, Maps, Search, Social, Username checks and more). Filter as you type; click to open in a new tab. Toggle it from the library icon in the browser toolbar.'
    ]
  },
  {
    version: '0.1.96',
    date: '2026-06-27',
    notes: [
      'Client-ready reports — exports now have an options panel: toggle GhostWire branding on/off, add a “Prepared by” analyst + organisation, and pick a classification (Confidential/Restricted/Internal/Unclassified). Every format (HTML, PDF, Word, Markdown) now opens with a professional cover (case reference, classification banner), an auto Executive Summary, and Scope & Methodology + Limitations & Disclaimer sections.',
      'Domain Recon is more thorough — added urlscan.io, RapidDNS and the Wayback Machine as subdomain sources, plus an active DNS brute of ~75 common subdomain names (skipped automatically on wildcard domains). Removed the dead Anubis source.'
    ]
  },
  {
    version: '0.1.95',
    date: '2026-06-27',
    notes: [
      'Auto-update pipeline fixed (for real). Releases are now staged as a prerelease and flipped live only once complete — this finally gets the installer, Linux packages and update manifest onto a single release reliably. Carries all the pending features: Domain Recon and “Add to investigation” across every tool.'
    ]
  },
  {
    version: '0.1.94',
    date: '2026-06-27',
    notes: [
      'Release pipeline fixed for good — installers are now uploaded explicitly to a single release draft instead of relying on the builder’s publisher (which kept splitting files across duplicate drafts and blocking updates). Includes everything from v0.1.92–93 (“Add to investigation” across all tools).'
    ]
  },
  {
    version: '0.1.93',
    date: '2026-06-27',
    notes: [
      'Fixed the release pipeline so updates publish reliably (v0.1.92 built fine but couldn’t go live). This release includes everything from v0.1.92 — “Add to investigation” buttons across Profile ID, Proximity, Cross-Reference, Wireless and Account Finder.'
    ]
  },
  {
    version: '0.1.92',
    date: '2026-06-27',
    notes: [
      'Add to investigation from every research tool — Profile ID, Proximity Search, Cross-Reference Images, Wireless (WiGLE) and Account Finder now have one-click buttons that push their findings (usernames, profiles, locations, networks, shared-source sites, accounts) straight onto the link chart and into the case’s known information, auto-linked.'
    ]
  },
  {
    version: '0.1.91',
    date: '2026-06-27',
    notes: [
      'New Domain Recon tool (Research → Domain Recon) — one click runs the equivalent of subfinder + assetfinder + amass (passive) + httprobe together: it pulls subdomains from several certificate-transparency / passive-DNS sources at once, folds in DNS + WHOIS, then probes every host for HTTP(S) liveness and grabs its page title and IP. Tick the findings you want and push them straight onto the investigation graph + known information. No keys, no installs.',
      'Add findings to your investigation from more tools — the Reddit archive tool now has “Add to investigation” / “Add all authors” buttons (and a per-result + case button) that drop recovered usernames onto the link chart and into the case’s known information.'
    ]
  },
  {
    version: '0.1.90',
    date: '2026-06-27',
    notes: [
      'Really fixed auto-update this time — the previous fix accidentally shipped two releases (0.1.88, 0.1.89) without the Windows update manifest, so update checks 404’d. Releases now build into a single draft and only go live once the manifest is verified present.'
    ]
  },
  {
    version: '0.1.89',
    date: '2026-06-27',
    notes: [
      'New Reddit archive tool — recover the username behind a deleted post or comment, or pull a user’s history, from the PullPush & Arctic Shift mirrors (no key). Paste a thread URL to get the original author even when Reddit shows [deleted], plus the usernames of deleted comments. Find it in the sidebar under Research, or via ⌘K.'
    ]
  },
  {
    version: '0.1.88',
    date: '2026-06-27',
    notes: [
      'Fixed “Update check failed … Cannot find latest.yml” — releases are now built as a draft and only published once the installers are fully uploaded, so checking for updates while a new version is still building no longer errors out.'
    ]
  },
  {
    version: '0.1.87',
    date: '2026-06-27',
    notes: [
      'Google is now the default search engine — typing a query in the address bar (or the home button) goes to Google.',
      'New tabs behave like a regular browser — opening a tab now lands on a blank page with the address bar focused and selected, so you can start typing a search or URL immediately.'
    ]
  },
  {
    version: '0.1.86',
    date: '2026-06-27',
    notes: [
      'Clearer API-key guidance — key inputs in Settings can now show an always-visible hint. Added one for WiGLE spelling out that you paste the long “Encoded for use” value (not the API Name or API Token on their own).'
    ]
  },
  {
    version: '0.1.85',
    date: '2026-06-27',
    notes: [
      'Browser session persists across restarts — your open tabs (and which one was active) are now restored when you reopen GhostWire, just as you left them. Logins/cookies were already kept per persona; now the tabs come back too.'
    ]
  },
  {
    version: '0.1.84',
    date: '2026-06-26',
    notes: [
      'Add notes to screenshots — after capturing a page or region (or saving a page) the browser now opens an annotate panel where you can give it a caption and write notes before it’s filed. The screenshot is saved first, so closing the panel never loses it.'
    ]
  },
  {
    version: '0.1.83',
    date: '2026-06-26',
    notes: [
      'Fixed: opening a new browser tab no longer turns the screen black. The selector-highlighting code ran against the freshly-opened (not-yet-ready) tab and threw, crashing the browser view — now wrapped safely.',
      'Fixed: turning the app-wide VPN exit OFF now reliably reverts the in-app browser to your real / home IP (previously it could keep routing through the last exit node).',
      'Selectors are now per-investigation — each case keeps its own set of highlighted terms instead of one shared global list.',
      'New “Pull known info from case” button in the browser’s Selectors panel — instantly seeds your selectors from the active investigation’s data points and every entity on its link charts.'
    ]
  },
  {
    version: '0.1.82',
    date: '2026-06-26',
    notes: [
      'Selectors & page-saving in the browser (Hunchly-style) — define terms of interest (names, emails, usernames…) and the in-app browser highlights every match on each page, with a hit-count badge so you instantly see if a page mentions them. Manage selectors from the highlighter button in the browser toolbar.',
      'Save a page to the investigation — the new bookmark button captures the current page (screenshot + URL + title) straight to the Evidence Board for the active case.'
    ]
  },
  {
    version: '0.1.81',
    date: '2026-06-26',
    notes: [
      'Caption your evidence images — each image now has an editable Caption field in its detail panel (also used as its title in the report and map).',
      'Rename map pins — edit a pinned location’s label from the map (pin popup → Rename) or from the evidence Geolocate panel.'
    ]
  },
  {
    version: '0.1.80',
    date: '2026-06-26',
    notes: [
      'Maltego-style auto-linking — when you add an entity from a search (e.g. an email), it now auto-connects to related entities already on your graph (email ↔ its domain, sub-domain ↔ parent domain, email ↔ matching username). A new “Auto-link” button on the Graph re-links any board on demand.'
    ]
  },
  {
    version: '0.1.79',
    date: '2026-06-26',
    notes: [
      'Clear app-wide exit toggle — VPN settings now have a simple On/Off switch: Off uses your real/home IP, On routes the whole app through the exit location you pick (and starts that tunnel for you). No more hunting to turn every exit off.'
    ]
  },
  {
    version: '0.1.78',
    date: '2026-06-26',
    notes: [
      'Account Finder now runs on the Sherlock engine — it hunts a username across ~480 sites using Sherlock’s own site database and detection logic (status code / error message / redirect), no Python needed. Live results, then drop the hits on your link chart.',
      'PhoneInfoga-style phone footprints — pivoting a phone number now offers WhatsApp/Sync.me/NumLookup/WhoCalld/800notes lookups plus reputation, social and leak dorks, alongside the existing number parsing.'
    ]
  },
  {
    version: '0.1.77',
    date: '2026-06-26',
    notes: [
      'New Wireless (WiGLE) tool — search WiGLE for WiFi networks by name (SSID) or access-point MAC (BSSID) and map where they were observed. Needs a free WiGLE API token in Settings.',
      'Fixed turning the VPN off — stopping the global tunnel (or clearing the global exit) now reliably reverts app-wide browsing to your real IP. Previously stopping a tunnel left sessions pinned to the dead proxy.'
    ]
  },
  {
    version: '0.1.76',
    date: '2026-06-26',
    notes: [
      'Themed Windows installer & uninstaller — a dark GhostWire sidebar matching the app.',
      'The “Create a desktop shortcut” option is now unchecked by default (opt-in).'
    ]
  },
  {
    version: '0.1.75',
    date: '2026-06-26',
    notes: [
      'Shodan, properly — on the Domain & IP page, “Load verbose data” pulls live Shodan host intel (org/ISP/ASN/OS, open ports & service banners, CVEs, tags, subdomains) and lets you pivot (search the org/ASN/product on Shodan, open the host). Needs your Shodan key.',
      'More website tools in the domain pivot — DNSdumpster and Web Check, alongside urlscan/BuiltWith/Domain Dossier/ViewDNS/DNSlytics/etc.',
      'Business pivots — OpenCorporates, AiHitData, Crunchbase and SEC EDGAR for an organization.',
      'Fixed: turning the global VPN exit off now reverts to your real IP immediately (pooled tunnel connections are dropped on switch).'
    ]
  },
  {
    version: '0.1.74',
    date: '2026-06-26',
    notes: [
      'Beefed-up website/domain pivots — pivoting a domain now groups the lookups into Whois & DNS (Domain Dossier, ViewDNS whois/DNS/IP-history, DNSlytics, crt.sh), Tech & infra (BuiltWith, Shodan, urlscan, VirusTotal, Wayback) and Relationships (SpyOnWeb, BacklinkWatch, VisualPing). IP pivots add VirusTotal, DNSlytics reverse-IP and SpyOnWeb.'
    ]
  },
  {
    version: '0.1.73',
    date: '2026-06-26',
    notes: [
      'Sock puppets now include a LinkedIn account in their starter set — with one-click open-and-autofill for LinkedIn sign-up/login, like the other platforms.'
    ]
  },
  {
    version: '0.1.72',
    date: '2026-06-26',
    notes: [
      'View Instagram without an account — pivoting a username now offers Imginn (profile/posts/stories viewer) and a Google site:instagram.com dork.',
      'The Facebook ID tool is now “Profile ID” and also resolves Instagram — get the numeric user ID and username for a Facebook or Instagram profile (paste a URL/username, or grab it from the profile open in the in-app browser).'
    ]
  },
  {
    version: '0.1.71',
    date: '2026-06-26',
    notes: [
      'New Facebook ID tool (Research) — pull the numeric user ID and the vanity (custom username) from a Facebook profile. Paste a URL/username to resolve it, or open the profile in the in-app browser and “Grab from the open tab” (the reliable way around Facebook’s login wall), with copy + open-profile actions and dedicated-resolver fallbacks.'
    ]
  },
  {
    version: '0.1.70',
    date: '2026-06-26',
    notes: [
      'Facebook search helpers added to the person pivot — SowSearch (Facebook graph-search URL builder) and IntelX’s Facebook tools, for finding people on Facebook without its native search.'
    ]
  },
  {
    version: '0.1.69',
    date: '2026-06-26',
    notes: [
      'View & search X/Twitter without an account — pivoting a username now offers a Nitter front-end (profile + that handle’s tweets), Sotwe, and a Google “on X” dork, so you can read tweets without logging in or registering.'
    ]
  },
  {
    version: '0.1.68',
    date: '2026-06-26',
    notes: [
      'Voter & public-records lookups added to the person pivot — VoterRecords (deep-linked to the name) plus reliable Google dorks for voter registration and county/public records. Note: VoterRecords is Cloudflare-protected and tends to block VPN/datacenter exits, so try it on a residential IP.'
    ]
  },
  {
    version: '0.1.67',
    date: '2026-06-26',
    notes: [
      'Lots more people-search options — pivoting on a person/name now offers TruePeopleSearch, FastPeopleSearch, FastBackgroundCheck, WhitePages, 411, Spokeo, That’sThem, WebMii, PeekYou, Radaris, Nuwber, ZabaSearch, AdvancedBackgroundChecks and Pipl, each deep-linked to the name. (Pivot a person node on the graph → People search.)'
    ]
  },
  {
    version: '0.1.66',
    date: '2026-06-26',
    notes: [
      'Quick username-aggregator links on the Account Finder — one-click WhatsMyName, NameChk and NameCheckup (copies the username to your clipboard and opens the site to paste). They’re also in the username Pivot set.'
    ]
  },
  {
    version: '0.1.65',
    date: '2026-06-26',
    notes: [
      'Added a visible “Jump to… ⌘K / Ctrl K” button in the top bar so the command palette is discoverable — click it (or press the shortcut) to jump to any page, investigation, persona or tool.'
    ]
  },
  {
    version: '0.1.64',
    date: '2026-06-26',
    notes: [
      'New Guide (top of the sidebar) — a full walkthrough of how GhostWire works, tool by tool, following the investigation loop. Every section has an “Open” button that jumps straight to that feature.'
    ]
  },
  {
    version: '0.1.63',
    date: '2026-06-26',
    notes: [
      'Free breach lookups on every email analysis — no API key needed. LeakCheck shows which breaches an address appears in (sources, dates, and which field types leaked), and Hudson Rock flags whether the address is tied to an info-stealer malware infection (a strong credential-compromise signal).'
    ]
  },
  {
    version: '0.1.62',
    date: '2026-06-26',
    notes: [
      'Email verification (Email Hippo) — analysing an email now checks whether the mailbox actually exists (deliverable / doesn’t exist / risky) with a trust score and disposable / role / free / catch-all flags. On a Company lookup you can verify any discovered address with one click. Add an Email Hippo API key in Settings → API keys.'
    ]
  },
  {
    version: '0.1.61',
    date: '2026-06-26',
    notes: [
      'Company lookup (Email & Phone Intelligence → Company) — enter a company name or domain and Hunter.io returns the people and email addresses it knows (name, role, department, seniority, confidence, LinkedIn), plus the org’s email pattern (e.g. {first}.{last}@domain). Copy any address, pivot on it, or add the whole company to the link chart. Uses your Hunter.io API key from Settings.'
    ]
  },
  {
    version: '0.1.60',
    date: '2026-06-26',
    notes: [
      'New Proximity Search (Research) — find every place where two things sit close together (e.g. a Westin within 150 m of a Wendy\'s) across a country, state or city. Powered by OpenStreetMap; results list with distances and plot on a map, each with Street View / Map / copy-coords actions. Great for narrowing a location from landmarks in a photo.'
    ]
  },
  {
    version: '0.1.59',
    date: '2026-06-26',
    notes: [
      'Click an evidence image to open it full-screen — zoom to actual size and back to fit for a closer look while investigating (Esc to close).',
      'Much nicer link-analysis chart in the HTML report — dark cards with type-coloured borders and the entity thumbnails, matching the in-app graph instead of plain white boxes.'
    ]
  },
  {
    version: '0.1.58',
    date: '2026-06-26',
    notes: [
      'Remove a pin from the Map — click a pinned evidence location and choose “Remove pin” to clear its location (and take it off the map).',
      'Fixed release publishing — installers (and the Linux build) were sometimes missing because the publisher raced to create the GitHub release; the release is now pre-created so every artifact uploads reliably, and release notes populate again.'
    ]
  },
  {
    version: '0.1.56',
    date: '2026-06-26',
    notes: [
      'Fixed the in-app browser reloading pages on its own — it was rewriting each tab\'s address on every navigation, which forced a reload (and looped on redirect-heavy sites). Tabs now navigate cleanly.',
      'Restored the Linux build — a release-pipeline error was failing the Windows job and skipping the Linux (AppImage/.deb) build entirely; the release step is now resilient and runs both platforms.'
    ]
  },
  {
    version: '0.1.55',
    date: '2026-06-26',
    notes: [
      'Fixed pages constantly refreshing / the URL endlessly changing in the in-app browser — the browser now presents a consistent desktop-Chrome identity (matching its User-Agent and client-hint headers), so Google and Cloudflare stop looping their bot checks.',
      'Security update — upgraded to Electron 42 and electron-builder 26, clearing the bulk of the dependency advisories.',
      'Map pins now have a “Street View” link — open Google Street View at any plotted location, in-app.',
      'HTML report — every photo now carries its “Exhibit N” badge, so the map pins and chain-of-custody entries match the right image.'
    ]
  },
  {
    version: '0.1.54',
    date: '2026-06-26',
    notes: [
      'New Cross-Reference Images tool (Research) — reverse-search several images, grab the result links from the open tab, and any board/profile/site that appears across multiple images rises to the top (great for finding the one Pinterest board or profile that hosts them all).',
      'Removed the automatic image-upload that was destabilising the browser — reverse image search is now copy-to-clipboard + the pinned paste panel.',
      'Set an evidence location by hand (latitude/longitude + label), alongside EXIF and AI guesses.',
      'HTML report overhaul — GhostWire logo, a live search box that filters the whole report, dark mode by default, a Location Map (now with tiles that load from disk), full per-photo metadata, and a fixed link-analysis chart that no longer balloons.',
      'Confirmation prompts added for the remaining destructive actions (deleting a VPN config, restoring a backup from a folder).'
    ]
  },
  {
    version: '0.1.53',
    date: '2026-06-26',
    notes: [
      'Reverse image search reworked — clicking an engine now copies the image to your clipboard and opens the engine in-app, with the image pinned in a side panel so you can re-copy and paste (Ctrl+V) into any of them. Reliable across Lens, Yandex, Bing, TinEye and PimEyes.',
      'Fixed pages getting stuck reloading / the URL endlessly changing — Google (Maps, Street View, Earth, Lens) and Cloudflare-protected sites were rejecting the embedded browser\'s identity. The in-app browser now uses a normal desktop-Chrome identity, so those sites load.',
      'Reports now include everything found on a photo — camera/EXIF, capture time, GPS, OCR text and all metadata — plus a Location Map with a pin per geolocated exhibit. The HTML report opens in dark mode by default.',
      'Street View / Google Earth buttons activate once a location is pinned.'
    ]
  },
  {
    version: '0.1.52',
    date: '2026-06-25',
    notes: [
      'Reverse image search now actually uploads your image — Google Lens / Yandex / Bing / TinEye / PimEyes open in-app and the saved image is dropped straight into the upload box (and copied to your clipboard as a fallback — Ctrl+V). No public URL needed.',
      'New Geolocate panel on every image exhibit — pin a location on the case Map from EXIF GPS, an AI guess, or by hand, with quick links to Street View, Google Earth and SunCalc. Pinned locations plot on the Map.',
      'AI image geolocation (optional) — with an OpenAI key, “AI best guess” reads the photo’s visual cues (signage, language, plates, architecture, terrain) and returns ranked locations you can pin. Add the key in Settings.'
    ]
  },
  {
    version: '0.1.51',
    date: '2026-06-25',
    notes: [
      'Everything stays in the app — links, pivots, search engines, photo GPS locations, context-menu actions and pop-ups now always open in the in-app browser, never your system browser.',
      'Fixed a runaway loop where some embedded pages (e.g. Google Lens) could spawn tabs endlessly — repeated/rapid opens are now de-duplicated and rate-limited.'
    ]
  },
  {
    version: '0.1.50',
    date: '2026-06-25',
    notes: [
      'Fixed OCR in the installed app — "Run OCR" failed with "Only absolute URLs are supported" because the bundled language model was being requested over the network. The model is now loaded directly from disk, so OCR works offline on Windows and Linux.'
    ]
  },
  {
    version: '0.1.49',
    date: '2026-06-25',
    notes: [
      'Chain of custody — each exhibit now has a "Verify integrity" check that re-hashes the stored file and compares it to the SHA-256 recorded at capture (verified / altered / missing), shown in a dedicated custody panel. Older exhibits get hashed on first check.',
      'Reports, reimagined — export as an interactive HTML deliverable (sidebar navigation, click-to-zoom evidence, dark-mode toggle, copy-hash, and a chain-of-custody appendix), an editable Word .docx, a print-ready PDF, or Markdown. Choose the format from the Report menu.'
    ]
  },
  {
    version: '0.1.48',
    date: '2026-06-25',
    notes: [
      'New Domain & Infrastructure Intelligence (Research) — for a domain: WHOIS, full DNS (A/MX/NS/TXT/CNAME), crt.sh subdomains and hosting org/geo; for an IP: organization, ASN, location, network and reverse DNS. One-click add-to-chart and pivots. No API key required.',
      'OCR now works fully offline — the English text model ships with the app, so “Run OCR” on evidence no longer needs an internet connection.'
    ]
  },
  {
    version: '0.1.47',
    date: '2026-06-25',
    notes: [
      'OCR on evidence — open any image in the Evidence Board and hit “Run OCR” to pull out its text (logos, documents, screenshots). The text is saved, copyable, and can be appended to the item’s note.',
      'Evidence is now searchable — a search box filters by title, source, notes and OCR text, so you can find that screenshot by what it says.'
    ]
  },
  {
    version: '0.1.46',
    date: '2026-06-25',
    notes: [
      'New Email & Phone Intelligence (Research) — profile an email: Gravatar profile + linked accounts, mail-server (MX) check, and breach exposure via Have I Been Pwned (add a HIBP key in Settings). Parse a phone number for country, line type and formats. Pivot or drop findings onto the link chart in one click.',
      'Added a Have I Been Pwned API key option in Settings.',
      'Pick a time zone by clicking a map — on an investigation’s Time zone field and the dashboard “Add clock”, hit Map to choose a location and GhostWire resolves the zone for you.'
    ]
  },
  {
    version: '0.1.45',
    date: '2026-06-25',
    notes: [
      'GhostWire now runs on Linux — releases include an AppImage and a .deb alongside the Windows installer (AppImage auto-updates too).',
      'Move everything between machines/platforms — Settings → Backups → “Export to file” bundles all your data, media and settings into a portable .gwpack; “Import from file” restores it on any OS and restarts.'
    ]
  },
  {
    version: '0.1.44',
    date: '2026-06-25',
    notes: [
      'Search every engine — the Dork builder and pivots now run across Google, Bing, DuckDuckGo, Yandex, Brave, Startpage, Mojeek, Baidu and Yahoo (right-click an engine for the system browser).',
      'Pivots open in the in-app browser by default now (system browser is a secondary option), and run as the sock puppet assigned to the active investigation — so they exit through that persona\'s VPN.',
      'App-wide VPN exit — set one exit in Settings → VPN (or the VPN tab) to route the entire app (browsing, lookups, transforms, downloads, mail) through it. A persona\'s own exit still wins; fails closed if the tunnel is down.'
    ]
  },
  {
    version: '0.1.43',
    date: '2026-06-25',
    notes: [
      'Evidence now shows the full metadata dump — every embedded EXIF/GPS/IPTC/XMP tag (camera, lens, exposure, GPS, timestamps, software, copyright…), file size, a GPS map link, and a “Copy all” button. Right-click any image in the browser → Add image to evidence to capture and inspect it.'
    ]
  },
  {
    version: '0.1.42',
    date: '2026-06-25',
    notes: [
      'New Map view — plots your location entities and photo GPS on a map; named places are geocoded via OpenStreetMap. Filter by investigation.',
      'Right-click images in the in-app browser — “Add image to evidence” (saved with SHA-256, EXIF readable on the Evidence Board), reverse image search, copy/open. The browser now has a full right-click menu (copy/paste in fields, link & selection actions) too.'
    ]
  },
  {
    version: '0.1.41',
    date: '2026-06-25',
    notes: [
      'Command palette — press Ctrl/⌘+K anywhere to jump to any page, investigation, persona or tool, and export the active investigation\'s report (PDF/HTML/Markdown).',
      'Graph intelligence — find/highlight nodes on the chart, one-click Tidy (auto-arrange by type), and Merge duplicates (rewires links onto a single node).',
      'Per-persona fingerprint hardening — each sock puppet gets a stable, unique browser fingerprint (user-agent, canvas, WebGL, hardware) so personas and your real browser don\'t look alike. Toggle in Settings → VPN.',
      'New PORP Exam Prep page (Training) — the pass requirements, a step-by-step methodology checklist that jumps to the right tool, and a one-click professional report template.'
    ]
  },
  {
    version: '0.1.40',
    date: '2026-06-25',
    notes: [
      'Select multiple nodes in the graph — toggle Pan/Select in the toolbar to drag a selection box, or shift-click to add nodes. Move the whole selection together (positions saved) or press Delete to remove them at once.'
    ]
  },
  {
    version: '0.1.39',
    date: '2026-06-25',
    notes: [
      'Dashboard world clocks — set a Time zone on an investigation (in its editor) and the dashboard shows a live clock for it next to your local time. Investigations with a time zone appear automatically (active one first).',
      'Add your own clocks too — “Add clock” on the dashboard pins any time zone (e.g. a target’s location) alongside local time.',
      'Reorganized the sidebar into clear sections — Investigation, Identities, and Research — so related tools sit together.'
    ]
  },
  {
    version: '0.1.38',
    date: '2026-06-25',
    notes: [
      'Fixed the active-investigation picker (top bar) not listing newly created investigations and showing blank when one was set — it now refreshes live. You can also set the active investigation from its page (Set active) or the ⭐ on each card.',
      'Unlink in the graph — double-click a link to remove it, or select it and press Delete/Backspace (deletes are saved). Deleting nodes by keyboard now persists too.',
      'Attach an image to any graph entity — in the entity panel, pick one straight from your Evidence Board (or upload). Great for putting a face on a person/email node.',
      'The right-side docks are now two separate pop-outs — Persona and Investigation each have their own edge tab.'
    ]
  },
  {
    version: '0.1.37',
    date: '2026-06-25',
    notes: [
      'New Account Finder — check a username across every major platform at once, with live found / not-found / unclear status. Open hits in the browser, or select them and drop them onto a link chart (linked to a username node) in one click.',
      'New Case Timeline — a chronological, day-grouped view of everything done on an investigation (captures, transforms, reports…), filterable by action type.'
    ]
  },
  {
    version: '0.1.36',
    date: '2026-06-25',
    notes: [
      'Case report export — from an investigation, Report → PDF / HTML / Markdown. PDF & HTML bundle a visual link-chart, evidence (with images, source & SHA-256 hash), notes, personas and the full activity timeline into one shareable file.',
      'Active investigation — star an investigation to make it active (highlighted in the list). Everything you capture (browser screenshots, evidence) files into it automatically.',
      'Investigation dock — the right-side slide-out now also shows your active investigation (subject, known data points, objectives, background) with a Persona/Investigation tab switch, so you can reference and copy case info while browsing.',
      'Browser screenshots are now region-select — click the camera, drag a box to capture just that area (or “Full visible”). Straight into the Evidence Board.',
      'Reverse image search from the Evidence Board now opens in the in-app browser instead of your system browser.'
    ]
  },
  {
    version: '0.1.35',
    date: '2026-06-25',
    notes: [
      'Open links straight from the graph — double-click any entity (or right-click → Open link) to open its URL in the in-app browser, with an “Open in system browser” option too. Works for social/profile nodes, documents, domains, and locations (opens a map).'
    ]
  },
  {
    version: '0.1.34',
    date: '2026-06-25',
    notes: [
      'New Evidence Board (sidebar) — a per-investigation media locker. Drag images in from your desktop, paste screenshots (Ctrl+V), or paste an image URL; everything is saved with a capture time and SHA-256 hash for integrity.',
      'Each item shows its source, timestamp, SHA-256 (click to copy) and EXIF (GPS opens a map pin, plus camera/date). One-click reverse image search (Google Lens, Yandex, Bing, TinEye, PimEyes), add the image to your link chart as an entity, save a copy, or add a note.',
      'Screenshots captured from the in-app Browser land here automatically under the active investigation.'
    ]
  },
  {
    version: '0.1.33',
    date: '2026-06-25',
    notes: [
      'New live Transform Log on the link chart — every transform/pivot you run shows up with its status (running, added N nodes, nothing new, needs a key, or failed with the exact error). Click an entry to jump to that entity; clear or collapse the panel anytime.',
      'Hunter results are clearer: email verification now reports the result, score, SMTP and MX checks (not just “deliverable”), and the domain-email lookup reports how many it found.'
    ]
  },
  {
    version: '0.1.32',
    date: '2026-06-25',
    notes: [
      'Maltego-style “Run all transforms” — right-click a graph node (or use the entity panel) to fire every available transform at once and pull all the results in as connected nodes. It skips transforms whose API key isn’t set, dedupes across the whole batch, and reports how many nodes it added.',
      'Reminder: transforms (the automated lookups that add data to the graph) live on the link chart — select or right-click an entity. “Pivot” opens web searches; “transforms” bring data back in.'
    ]
  },
  {
    version: '0.1.31',
    date: '2026-06-25',
    notes: [
      'X/Twitter accounts now open in your system browser instead of the in-app browser — X spawns popup windows during sign-up that can’t work inside an embedded view. The persona stays pinned to the dock so you can paste its details.',
      'Pivots default to opening in your system browser now — many lookup sites (LinkedIn, social profiles, Truecaller, PimEyes, etc.) block embedding and were failing to load in app tabs. “In-app tabs” is still there as a secondary option when you want a persona session.'
    ]
  },
  {
    version: '0.1.30',
    date: '2026-06-25',
    notes: [
      'Autofill is now disabled entirely on X/Twitter — its sign-up is too fragile to script, so GhostWire leaves it alone (use the Persona Dock to copy details in). This stops the glitching when you click Continue.',
      'Marking a sock-puppet account as created/validated now saves immediately — the status sticks without needing to hit Save.'
    ]
  },
  {
    version: '0.1.29',
    date: '2026-06-25',
    notes: [
      'Fixed autofill breaking complex sign-ups (notably X/Twitter): it’s now gentle — each field is filled once, it never steals your cursor, it leaves fields you’ve started typing in alone, and it stops quickly instead of fighting the page. Use the 🔑 button to re-fill the current step on demand.'
    ]
  },
  {
    version: '0.1.28',
    date: '2026-06-25',
    notes: [
      'Fixed X/Twitter (and other) sign-ups demanding a Windows security key / passkey — GhostWire now disables passkey prompts inside the in-app browser so sites fall back to normal password sign-up.',
      'Generated usernames are now valid on Reddit, X and Discord — dots are stripped (those platforms don’t allow them).',
      'X/Twitter sign-up now opens on the current x.com flow.'
    ]
  },
  {
    version: '0.1.27',
    date: '2026-06-25',
    notes: [
      'New Backups (Settings → Backups): pick a folder and back up everything — investigations, personas, notes, link charts, evidence images and settings. Back up on demand, turn on daily automatic backups, and restore any previous backup in one click (the app restarts into it). The most recent 15 backups are kept.',
      'VPN exits are now auto-named by location — imported Proton configs show their country (e.g. “United States · US-NY#1”) so it’s obvious which exit to assign to which persona.'
    ]
  },
  {
    version: '0.1.26',
    date: '2026-06-25',
    notes: [
      'One-click VPN engine install — the VPN tab can now download and set up the wireproxy helper for you automatically (no more downloading archives or fiddling with PATHs/folders).',
      'Clearer Proton setup — the guide now tells you exactly what to pick on Proton’s WireGuard page (Platform: GNU/Linux, Moderate NAT off, NAT-PMP off, VPN Accelerator on, then pick a country and Create).',
      'The pinned Persona Dock now updates instantly when you edit and save a sock puppet.',
      'Generated avatars no longer carry the small “this person does not exist” watermark — it’s cropped off (and a clean source is preferred).'
    ]
  },
  {
    version: '0.1.25',
    date: '2026-06-25',
    notes: [
      'New Persona Dock — a pinnable side panel that keeps a sock puppet’s details and account credentials visible across every tab (including the in-app Browser), so you can copy-paste them into sign-up forms without losing the card. Pin it from a persona’s 📌 button, or it opens automatically when you launch a sign-up/login.',
      'Copy buttons now actually copy — switched to the OS clipboard (the web clipboard is blocked in the packaged app), so the identity fields and dock copy reliably.',
      'Sign-up autofill is more thorough — it now keeps filling fields that appear later in multi-step registration wizards, not just the first screen.',
      'Mailbox no longer pops out a separate window when signing into webmail — the login stays inline in the tab so auto sign-in can fill it.'
    ]
  },
  {
    version: '0.1.24',
    date: '2026-06-25',
    notes: [
      'Sock puppet accounts now open the real sign-up page (not the login page) when the account hasn’t been created yet — so the persona’s name, birthday, email, etc. autofill on the registration form. Once you mark an account “created”, the button switches to opening the login page instead.',
      'New click-to-copy Identity panel in the persona editor — copy any detail (name, first/last, username, email, phone, birthday + split day/month/year, age, gender, location, nationality) with one click, or “Copy all”, for sites where autofill doesn’t catch every field.'
    ]
  },
  {
    version: '0.1.23',
    date: '2026-06-25',
    notes: [
      'Fixed the Mailbox tab showing a black screen — the new auto-fill could crash the view if it ran before the webmail page was ready. It now fails safely and retries once the page loads.'
    ]
  },
  {
    version: '0.1.22',
    date: '2026-06-25',
    notes: [
      'Mailbox auto sign-in now fills the password on the second Google/Microsoft step — it watches the page for the password box appearing after you pick the account, instead of only filling once on load. Still backed by the 🔑 manual fill button.',
      'Settings now uses the full window width instead of a narrow centered column.'
    ]
  },
  {
    version: '0.1.21',
    date: '2026-06-25',
    notes: [
      'Mailbox auto sign-in is much more reliable — it now keeps filling the email and password as the login advances (providers like Gmail reveal the password box on a second step), and there’s a 🔑 button to fill it on demand. The webmail view also uses a real desktop browser identity to avoid “insecure browser” blocks.',
      'Per-persona VPN exits: import Proton WireGuard configs and route each sock puppet through a different country (userspace, no admin rights). Manage tunnels in Settings → VPN or the VPN tab; sessions are fail-closed and WebRTC is locked to the proxy.',
      'Fixed an upgrade issue where older databases were missing the new nationality/phone persona fields.'
    ]
  },
  {
    version: '0.1.20',
    date: '2026-06-25',
    notes: [
      'Redesigned the dashboard into a proper command center — a hero with a live ops clock, time-aware greeting, animated grid + glow backdrop, and a one-click “Resume” for your most recent investigation.',
      'Premium stat cards and tool/action tiles with lift, glow-ring, and a sweeping sheen on hover; list rows now highlight with an accent edge and animated chevrons.',
      'New app-wide motion & polish layer (gradient text, glass surfaces, fade-up entrances) that follows your active theme and respects “reduce motion”.'
    ]
  },
  {
    version: '0.1.19',
    date: '2026-06-25',
    notes: [
      'Persona autofill now fills sign-up forms, not just logins — opening a site for a persona auto-populates first/last name, email (and confirm-email), username, password (and confirm), birthday, gender, and phone. Tuned for Facebook and generic registration pages; the 🔑 button re-fills on demand.',
      'Quick Create can target a country (US, UK, Canada, Australia, Ireland, Germany, France, Netherlands, or Any) — the location, nationality, and phone number are generated to match.',
      'Mailbox: store the receiving account’s password (optional) so GhostWire re-fills the webmail login automatically if you get signed out.',
      'Dates now display as Day Month Year (e.g. 25 Jun 2026) everywhere, and investigation reports use a clear timestamped format with timezone.'
    ]
  },
  {
    version: '0.1.18',
    date: '2026-06-24',
    notes: [
      'Disposable persona mailboxes are far more reliable — GhostWire now falls back from mail.tm to mail.gw when one provider runs out of domains, so persona email creation rarely fails. (Read these right in the app from a persona’s Inbox.)',
      'Clarified the two ways to receive mail: per-persona disposable inboxes (read natively in-app) vs. a catch-all domain that forwards everything to one account you read in the Mailbox tab.',
      'Mailbox setup guide now recommends a dedicated receiving account (e.g. a throwaway Gmail) rather than your personal inbox, and explains the catch-all → webmail flow more clearly.'
    ]
  },
  {
    version: '0.1.17',
    date: '2026-06-24',
    notes: [
      'Update prompt: “Skip for now” is temporary again — re-checking (or the next launch) re-prompts to install.',
      'Fixed random-face avatars (the old source stopped serving images) — now fetches a real AI-generated face, with a fallback and a clear error if it can’t. You can also Save a persona’s avatar to upload it to profiles.',
      'New Mailbox tab: with a catch-all domain set, log in to your inbox to read alias mail; without one, a step-by-step setup guide (Cloudflare Email Routing) with links.',
      'Quick Create now uses your catch-all domain for the persona’s email when configured.',
      'Redesigned dashboard — cleaner, consistent layout (hero + stats, quick start, recent investigations/personas/notes, tools, quick capture).'
    ]
  },
  {
    version: '0.1.16',
    date: '2026-06-24',
    notes: [
      'Custom themed window title bar — the minimize / maximize / close controls now match your theme (the window is frameless and draggable).',
      'Quality pass: full typecheck/build/boot check, no stray debug or unthemed popups; README refreshed for all current features.'
    ]
  },
  {
    version: '0.1.15',
    date: '2026-06-24',
    notes: [
      'Export the investigation link chart as a PNG — fits the whole graph and lets you choose where to save it.',
      'Privacy note: the local database is intentionally not app-encrypted — a trial of OS-keystore encryption could fail to decrypt across launches (data-loss risk), so we recommend OS full-disk encryption (BitLocker) instead. Settings reflects this.'
    ]
  },
  {
    version: '0.1.14',
    date: '2026-06-24',
    notes: [
      'Random AI-face avatars for personas — “Random face” in the editor, and auto-added on Quick Create.',
      'EXIF transform on image entities: pulls GPS into a location node and camera/date/software into properties.',
      'Per-investigation activity log — transforms, evidence captures and report exports are recorded as a methodology trail in the investigation.'
    ]
  },
  {
    version: '0.1.13',
    date: '2026-06-24',
    notes: [
      'Screenshot-to-evidence: a Capture button in the browser snapshots the page with its URL, a UTC timestamp and a SHA-256 hash, filed under the active investigation (pick it in the top bar).',
      'Investigation report export: one-click Markdown rollup of subject, known data, evidence (with hashes) and linked items.',
      'Catch-all email provider: set your own domain in Settings to give personas durable handle@yourdomain addresses alongside mail.tm.',
      'Persona accounts now track created vs. not-yet-made, with a created count and a clearer “open site to register/log in” action.',
      'Fixed the mail.tm “no domains available” error (now tries multiple domains).'
    ]
  },
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
