<div align="center">

<img src="icon.png" alt="GhostWire" width="128" height="128" />

# GhostWire

**An all-in-one OSINT workbench for your desktop.**

Sock puppets with isolated browser sessions & per-persona VPN exits · a Maltego-style link graph with transforms · investigations with evidence, timelines & shareable reports · a built-in browser · account enumeration · curated tools & API integrations · Markdown notes that export to Obsidian.

[![Latest release](https://img.shields.io/github/v/release/AsleepCoffee/Ghostwire?label=download&style=flat-square)](https://github.com/AsleepCoffee/Ghostwire/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/AsleepCoffee/Ghostwire/total?style=flat-square)](https://github.com/AsleepCoffee/Ghostwire/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-0a0c10?style=flat-square)
![Built with Electron](https://img.shields.io/badge/built%20with-Electron%20%2B%20React-22d3ee?style=flat-square)

</div>

---

## ⬇️ Download

Grab the latest build from the **[Releases page](https://github.com/AsleepCoffee/Ghostwire/releases/latest)**:

- **Windows** — `GhostWire-Setup-x.y.z.exe`
- **Linux** — `GhostWire-x.y.z.AppImage` (chmod +x and run) or the `.deb`

Run it and you're set. The app keeps itself up to date automatically (Windows + AppImage) — when a new version is published it offers to **install now** or **skip for now**, and you can check manually under **Settings → Updates**. Moving machines? Use **Settings → Backups → Export to file** to get a portable `.gwpack` and **Import** it on the other platform.

> The installer isn't code-signed, so Windows SmartScreen may show a “more info → run anyway” prompt on first launch. That's normal for indie apps without a paid signing certificate.

## 🔒 Verify your download

Every release includes a **`SHA256SUMS.txt`** listing the SHA-256 of each file. Don't take the binary on faith — check it:

- **Windows (PowerShell):** `Get-FileHash .\GhostWire-Setup-<version>.exe -Algorithm SHA256`
- **Linux / macOS:** `sha256sum GhostWire-<version>.AppImage`

Compare the result to the matching line in `SHA256SUMS.txt` on the release. If they differ, don't run it.

## 🛠️ Build from source

GhostWire is fully open source — if you'd rather not trust a prebuilt binary, **compile your own**. The official releases are produced by CI from these exact commands (see [`.github/workflows/release.yml`](.github/workflows/release.yml)), so your local build runs the same code.

**1. Prerequisites**

- [**Node.js 22+**](https://nodejs.org/) and **npm** (`node --version` should print v22 or higher)
- [**git**](https://git-scm.com/)
- Build on the OS you want to ship: **Windows** produces the `.exe` installer, **Linux** produces the `.AppImage` and `.deb`. (There's no cross-compiling.)

**2. Get the code**

```bash
git clone https://github.com/AsleepCoffee/Ghostwire.git
cd Ghostwire
git checkout v1.0.1          # optional: build a specific release tag instead of main
```

**3. Install exact dependencies**

```bash
npm ci                       # uses the locked versions in package-lock.json
```

**4. Build the installer for your platform**

```bash
# On Windows:
npm run build:win            # -> dist/GhostWire-Setup-<version>.exe  (+ .blockmap, latest.yml)

# On Linux:
npm run build:linux          # -> dist/GhostWire-<version>.AppImage  and  ghostwire_<version>_amd64.deb
```

The finished installer/AppImage is written to the **`dist/`** folder. Install or run it like any other download.

**Run it without packaging (for development):**

```bash
npm run dev                  # launches the app from source with hot reload
npm run typecheck            # optional: TypeScript checks
```

> **Note:** a self-built installer won't be byte-for-byte identical to the published one — Electron embeds build timestamps, so the binaries aren't bit-reproducible. The **source at each tag is what's published**, and running your own build (or `npm run dev`) means you never have to trust the prebuilt binary at all.

The installer/AppImage lands in `dist/`. To run from source without packaging: `npm run dev`. Type-check with `npm run typecheck`.

## ✨ Features

- **🎭 Sock Puppet Manager** — build personas with full identity details, **random AI-face avatars**, linked accounts with login **and sign-up form autofill**, and a one-click identity + password generator (localised by country). Each persona gets a **fully isolated browser session** (be logged into the same site as several identities at once), can provision a **disposable mailbox** (mail.tm/mail.gw, with a built-in inbox) or use your own **catch-all domain**, and tracks which accounts are created vs. still to make.
- **🕵️ Investigations** — a workspace per target (person or company). Capture structured **known information**, set one as the **active investigation** so captures file to it automatically, pivot on any data, drop findings onto a link chart, attach **evidence**, keep an **activity log**, and **export a full case report as PDF, HTML, or Markdown** (link chart + evidence with hashes + notes + timeline).
- **🕸️ Graph Workspace** — a Maltego-style canvas with **transforms that pull real data into the graph** (right-click a node, or **Run all transforms**): crt.sh subdomains, DNS & Wayback, live username enumeration, EXIF→location, and API-powered enrichment (VirusTotal, Shodan, Hunter, AbuseIPDB, IPinfo) — with a **live transform log**. Open a node's link in the browser, attach an image from evidence, unlink edges, auto-dedupe, and **export the chart as a PNG**.
- **🖼️ Evidence Board** — a per-investigation media locker. Drag images in, paste screenshots, or paste an image URL; each is saved with a capture time and **SHA-256** hash. Read **EXIF** (GPS → map pin, camera/date), run **reverse image search** (Google Lens / Yandex / Bing / TinEye / PimEyes), and add an image to the link chart.
- **🌐 Embedded Browser** — a real tabbed Chromium browser with a per-tab persona switcher. **Region-select screenshots to evidence** (URL + UTC timestamp + SHA-256, filed to the active investigation). Sites that block embedding fall back to your system browser in one click.
- **🔍 Account Finder** — check a username across every major platform at once with live found/not-found status, then drop the hits straight onto a link chart.
- **🛡️ Per-persona VPN** — import Proton WireGuard configs (one-click engine install) and route each sock puppet through a different country at once — userspace, fail-closed, no admin rights.
- **🎯 Dork & Pivot** — a Google-dork builder plus a pivot engine that, for any value (email, username, domain, IP, name…), opens the right lookups — including the API tools you hold a key for, deep-linked per data type.
- **🧰 Tools & API Integrations** — a curated launcher of OSINT tools, plus integrations that unlock when you add a free or paid API key (VirusTotal, Shodan, AbuseIPDB, urlscan, IPinfo, Hunter, Censys, and more) — with a **Test** button for each key.
- **📝 Notes & ⏱️ Timeline** — Markdown notes with live preview, folders, tags and image paste (**one-click export to Obsidian**), plus a per-investigation **case timeline** of every action.
- **🧭 Reference docks & world clocks** — slide-out docks keep the active persona and investigation details handy on any tab; the dashboard shows live clocks for your target's time zones.
- **💾 Backups** — back up everything (database + media) to a folder on demand or automatically, and restore in one click.
- **🎨 10 full-app themes**, a custom themed window frame, themed dialogs, and auto-updates from GitHub releases.

All data is stored **locally** in a SQLite database in your app-data folder. Nothing leaves your machine unless you explicitly use a tool or API.

## 🔒 Privacy & security

- Everything lives locally (SQLite + Markdown). GhostWire has no backend and phones home only to GitHub to check for updates and to the OSINT services/APIs you explicitly use.
- Persona credentials, API keys and mailbox passwords are stored **unencrypted** in the local database — enable OS full-disk encryption (e.g. BitLocker) and keep your device secured. The built-in **Backups** are unencrypted too, so store them somewhere safe.

## ⚖️ Responsible use

GhostWire is for **authorized, lawful OSINT** — security research, investigations you're permitted to run, CTFs, journalism, and education. You are responsible for complying with the terms of service of any site you access and with the laws of your jurisdiction. Don't use it to harass, stalk, or harm.

## 🛠️ Development

Requires Node.js 22+.

```bash
npm install        # install dependencies
npm run dev        # launch with hot reload
npm run build      # production build into ./out
npm run start      # preview the production build
npm run build:win  # build a Windows installer into ./dist
```

GhostWire is **Electron + React + TypeScript** (electron-vite), styled with **Tailwind CSS**, using **sql.js** (WebAssembly SQLite — no native build step), **@xyflow/react** for the graph, and **react-markdown** for notes.

```
src/
  main/        Electron main — window, SQLite DB, IPC, media, mail, VPN, backups, updater, reports, API tests/EXIF
  preload/     contextBridge API exposed to the renderer as window.api
  renderer/    React app
    src/
      pages/       Dashboard, Investigations, Graph, Evidence, Account Finder, Timeline, Tools, Dork, Browser, Mailbox, VPN, Notes, Settings
      components/  TitleBar, Sidebar, Topbar, reference docks, dialogs, shared UI
      lib/         API wrapper, pivot/transform engines, themes, settings, constants
  shared/      Types shared between main and renderer
```

## 📦 Releases

Releases are built and published automatically by GitHub Actions when a version tag is pushed:

```bash
# bump "version" in package.json, then:
git tag v1.0.1
git push origin main --tags
```

The workflow builds the Windows installer and attaches it (plus `latest.yml` for auto-update) to a GitHub Release, with notes pulled from [`CHANGELOG.md`](CHANGELOG.md).

## 📄 License

[MIT](LICENSE) © GhostWire contributors

