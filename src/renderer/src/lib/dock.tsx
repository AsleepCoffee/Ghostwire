import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Persona } from './api'

interface DockCtx {
  /** The persona whose details are pinned to the persona dock (or null). */
  persona: Persona | null
  personaOpen: boolean
  projectOpen: boolean
  /** Pin a persona to the persona dock and open it. */
  pin: (p: Persona) => void
  unpin: () => void
  setPersonaOpen: (v: boolean) => void
  setProjectOpen: (v: boolean) => void
  /** Refresh the pinned persona's data from a fresh list (after an edit/save). */
  refresh: (list: Persona[]) => void
}

const Ctx = createContext<DockCtx>({
  persona: null,
  personaOpen: false,
  projectOpen: false,
  pin: () => {},
  unpin: () => {},
  setPersonaOpen: () => {},
  setProjectOpen: () => {},
  refresh: () => {}
})

/** Holds open state for the two always-on-top reference docks (pinned persona and
 *  active investigation) so their details stay handy while you work. */
export function PersonaDockProvider({ children }: { children: ReactNode }): JSX.Element {
  const [persona, setPersona] = useState<Persona | null>(null)
  const [personaOpen, setPersonaOpen] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const pin = (p: Persona): void => {
    setPersona(p)
    setPersonaOpen(true)
  }
  const unpin = (): void => setPersona(null)
  const refresh = (list: Persona[]): void =>
    setPersona((prev) => (prev ? list.find((x) => x.id === prev.id) ?? null : null))
  return (
    <Ctx.Provider value={{ persona, personaOpen, projectOpen, pin, unpin, setPersonaOpen, setProjectOpen, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePersonaDock(): DockCtx {
  return useContext(Ctx)
}
