import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export interface OpenRequest {
  urls: string[]
  personaId?: string
}

let pending: OpenRequest | null = null
const subs = new Set<(r: OpenRequest) => void>()

/** Queue a browser-open request and deliver to a live Browser, or stash until one mounts. */
export function requestOpen(req: OpenRequest): void {
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

/** Hook returning an opener that navigates to the browser and opens the given urls as tabs. */
export function useOpenInBrowser(): (urls: string[], personaId?: string) => void {
  const navigate = useNavigate()
  return useCallback(
    (urls: string[], personaId?: string) => {
      if (urls.length === 0) return
      requestOpen({ urls, personaId })
      navigate('/browser')
    },
    [navigate]
  )
}
