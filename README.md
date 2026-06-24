# GhostWire

An OSINT workbench desktop app — built while working through TCM Security's **Practical OSINT Research Professional** course.

GhostWire brings the core of an OSINT workflow into one dark "command center":

- **Sock Puppet Manager** — create and manage personas with full identity details, linked accounts, tags, and a built-in identity generator. Each persona gets a **fully isolated browser session** (separate cookies/storage), so you can be logged into the same site as multiple identities at once with zero cross-contamination.
- **Embedded Browser** — a Chromium webview with an address bar and a persona session switcher. Browse as any sock puppet; logins persist per-persona.
- **Tools & Resources** — a launcher of curated OSINT tools (search, username enumeration, breach lookup, infrastructure, geo, image/face, social, toolkits). Inject a search term into `{QUERY}` tools and open them in the embedded browser. Add your own.
- **Graph Workspace** — a Maltego-style canvas to map entities (people, emails, usernames, domains, IPs, orgs, locations, wallets…) and the links between them, with a per-entity property inspector.
- **Notes** — Markdown note-taking with live preview, folders, tags, and **one-click export to your Obsidian vault** (YAML frontmatter included).

All data is stored **locally** in a SQLite database in your app-data folder. Nothing leaves your machine.

## Tech stack

- **Electron** + **React** + **TypeScript**, bundled with **electron-vite**
- **Tailwind CSS** for the UI
- **sql.js** (SQLite compiled to WebAssembly — no native build step required)
- **@xyflow/react** (React Flow) for the entity graph
- **react-markdown** + **remark-gfm** for note rendering

## Getting started

```bash
npm install        # install dependencies
npm run dev        # launch in development (hot reload)
npm run build      # production build into ./out
npm run start      # preview the production build
npm run build:win  # package a Windows installer (electron-builder)
```

> On first launch GhostWire seeds a curated set of OSINT tools and creates its SQLite
> database under your Electron `userData` directory (`%APPDATA%/ghostwire` on Windows).

## Install & auto-updates

Pre-built Windows installers are published on the
[Releases](https://github.com/AsleepCoffee/Ghostwire/releases) page
(`GhostWire Setup x.y.z.exe`). The app checks GitHub for a newer release on
launch, downloads it in the background, and offers to restart & install — you
can also trigger a check from **Settings → Updates**.

> Auto-update reads release metadata over GitHub's public API, so it requires
> the repository (and its releases) to be **public**. While the repo is
> private the in-app check simply reports it couldn't find an update.
>
> The installer is **not code-signed**, so Windows SmartScreen will show a
> "more info → run anyway" prompt on first launch.

## Cutting a release

Releases are built and published by GitHub Actions when a version tag is pushed:

```bash
# bump "version" in package.json first, then:
git tag -a v0.2.0 -m "GhostWire v0.2.0"
git push origin v0.2.0
```

The [`Release` workflow](.github/workflows/release.yml) builds the Windows
installer on a runner and uploads it (plus `latest.yml`, which auto-update
reads) to a GitHub Release for that tag. To build an installer locally without
publishing: `npm run build:win` (output in `dist/`).

## Project structure

```
src/
  main/        Electron main process — window, SQLite (sql.js) DB, IPC handlers, MD export
  preload/     contextBridge API exposed to the renderer as window.api
  renderer/    React app (Vite)
    src/
      pages/       Dashboard, SockPuppets, Browser, Notes, Tools, Graph, Settings
      components/  Sidebar, Topbar, shared UI primitives
      lib/         API wrapper, constants, identity generator
  shared/      Types shared between main and renderer
```

## Notes on sock puppet isolation

Each persona is assigned a unique Electron session partition (`persist:persona_<id>`).
The embedded browser mounts a `<webview>` with that partition, giving every identity its
own cookie jar and local storage. Switching identities in the browser remounts the webview
against the selected partition.

## Security

- Persona credentials are stored in plaintext in the local SQLite DB. Keep your device
  encrypted and secured.
- Use this tool only for authorized research, education, and lawful OSINT work.

---

Built with [Claude Code](https://claude.com/claude-code).
