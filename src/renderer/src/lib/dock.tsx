import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Persona } from './api'

interface DockCtx {
  /** The persona whose details are pinned to the side dock (or null). */
  persona: Persona | null
  open: boolean
  /** Pin a persona to the dock and open it. */
  pin: (p: Persona) => void
  setOpen: (v: boolean) => void
  unpin: () => void
  /** Refresh the pinned persona's data from a fresh list (after an edit/save).
   *  Drops the pin if the persona no longer exists. Preserves open state. */
  refresh: (list: Persona[]) => void
}

const Ctx = createContext<DockCtx>({
  persona: null,
  open: false,
  pin: () => {},
  setOpen: () => {},
  unpin: () => {},
  refresh: () => {}
})

/** Holds the persona pinned to the always-on-top reference dock, so its details
 *  stay available while you're on the Browser tab filling a sign-up form. */
export function PersonaDockProvider({ children }: { children: ReactNode }): JSX.Element {
  const [persona, setPersona] = useState<Persona | null>(null)
  const [open, setOpen] = useState(true)
  const pin = (p: Persona): void => {
    setPersona(p)
    setOpen(true)
  }
  const unpin = (): void => setPersona(null)
  const refresh = (list: Persona[]): void =>
    setPersona((prev) => (prev ? list.find((x) => x.id === prev.id) ?? null : null))
  return <Ctx.Provider value={{ persona, open, pin, setOpen, unpin, refresh }}>{children}</Ctx.Provider>
}

export function usePersonaDock(): DockCtx {
  return useContext(Ctx)
}
