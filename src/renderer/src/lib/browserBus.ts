import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export interface Autofill {
  username?: string
  password?: string
  /** Richer profile fields, used to fill sign-up / registration forms. */
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
  /** ISO birthdate (YYYY-MM-DD). */
  birthdate?: string
  /** 'Male' | 'Female' | other freeform. */
  gender?: string
  phone?: string
}

export interface TabRequest {
  url: string
  personaId?: string
  autofill?: Autofill
}

export interface OpenRequest {
  tabs: TabRequest[]
}

let pending: OpenRequest | null = null
const subs = new Set<(r: OpenRequest) => void>()

// Loop protection: misbehaving embedded pages (e.g. Google Lens) can spawn
// popups / redirect repeatedly, which would otherwise pile up infinite tabs.
const recentUrl = new Map<string, number>()
let batchTimes: number[] = []
const DEDUPE_MS = 1500
const RATE_WINDOW_MS = 3000
const RATE_MAX = 6

/** Queue a browser-open request and deliver to a live Browser, or stash until one mounts. */
export function requestOpen(req: OpenRequest): void {
  const now = Date.now()
  // Prune old dedupe entries so the map can't grow unbounded.
  if (recentUrl.size > 200) for (const [u, t] of recentUrl) if (now - t > 60000) recentUrl.delete(u)

  // Drop URLs opened in the last moment — breaks redirect/popup loops.
  const tabs = req.tabs.filter((t) => {
    const last = recentUrl.get(t.url) ?? 0
    recentUrl.set(t.url, now)
    return now - last >= DEDUPE_MS
  })
  if (tabs.length === 0) return

  // If many open-bursts fire in a short window, something is looping — stop opening.
  batchTimes = batchTimes.filter((t) => now - t < RATE_WINDOW_MS)
  if (batchTimes.length >= RATE_MAX) return
  batchTimes.push(now)

  const out: OpenRequest = { tabs }
  if (subs.size > 0) {
    subs.forEach((s) => s(out))
  } else {
    pending = out
  }
}

export function consumePending(): OpenRequest | null {
  const p = pending
  pending = null
  return p
}

export function subscribeOpen(cb: (r: OpenRequest) => void): () => void {
  subs.add(cb)
  return () => {
    subs.delete(cb)
  }
}

// An image staged for manual paste (Ctrl+V) into a reverse-image-search engine.
// Shown as a side panel in the browser so it can be re-copied at any time.
export interface PasteImage {
  dataUrl: string
  label: string
}
let pasteImg: PasteImage | null = null
const pasteSubs = new Set<(p: PasteImage | null) => void>()
export function setPasteImage(p: PasteImage | null): void {
  pasteImg = p
  pasteSubs.forEach((s) => s(pasteImg))
}
export function getPasteImage(): PasteImage | null {
  return pasteImg
}
export function subscribePasteImage(cb: (p: PasteImage | null) => void): () => void {
  pasteSubs.add(cb)
  return () => {
    pasteSubs.delete(cb)
  }
}

// The active browser tab's link reader, registered by <Browser>. Lets the
// cross-reference tool scrape the result links from a reverse-image-search page
// the user has open, without leaving the app.
export interface TabSnapshot {
  url: string
  title: string
  links: string[]
}
let tabReader: (() => Promise<TabSnapshot | null>) | null = null
export function registerTabReader(fn: (() => Promise<TabSnapshot | null>) | null): () => void {
  tabReader = fn
  return () => {
    if (tabReader === fn) tabReader = null
  }
}
export async function readActiveTab(): Promise<TabSnapshot | null> {
  return tabReader ? tabReader() : null
}

// A navigator registered once by <App>, so non-React code (the api wrapper, IPC
// listeners) can route URLs into the in-app browser without a hook.
let navigateTo: ((path: string) => void) | null = null
export function setBrowserNavigator(fn: ((path: string) => void) | null): void {
  navigateTo = fn
}

/** Open URLs as tabs in the in-app browser and switch to it. Safe to call from
 *  anywhere (no React context needed). This is how the app guarantees that
 *  nothing ever opens in an external/system browser. */
export function openInAppBrowser(urls: string[], personaId?: string): void {
  const list = urls.filter((u) => typeof u === 'string' && u.trim().length > 0)
  if (list.length === 0) return
  requestOpen({ tabs: list.map((url) => ({ url, personaId })) })
  navigateTo?.('/browser')
}

/** Hook: navigate to the browser and open URLs as tabs (optionally under a persona). */
export function useOpenInBrowser(): (urls: string[], personaId?: string) => void {
  const navigate = useNavigate()
  return useCallback(
    (urls: string[], personaId?: string) => {
      if (urls.length === 0) return
      requestOpen({ tabs: urls.map((url) => ({ url, personaId })) })
      navigate('/browser')
    },
    [navigate]
  )
}

/** Hook: open richer tab requests (e.g. with autofill credentials). */
export function useOpenTabs(): (tabs: TabRequest[]) => void {
  const navigate = useNavigate()
  return useCallback(
    (tabs: TabRequest[]) => {
      if (tabs.length === 0) return
      requestOpen({ tabs })
      navigate('/browser')
    },
    [navigate]
  )
}
