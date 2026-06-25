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

/** Queue a browser-open request and deliver to a live Browser, or stash until one mounts. */
export function requestOpen(req: OpenRequest): void {
  if (req.tabs.length === 0) return
  if (subs.size > 0) {
    subs.forEach((s) => s(req))
  } else {
    pending = req
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
