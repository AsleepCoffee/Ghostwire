import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type AppSettings } from './api'

export interface Theme {
  id: string
  label: string
  /** "r g b" triplets consumed by CSS variables. */
  brand: string
  brandGlow: string
  accent: string
  accentGlow: string
}

export const THEMES: Theme[] = [
  { id: 'cyan', label: 'Cyan (default)', brand: '59 130 246', brandGlow: '96 165 250', accent: '34 211 238', accentGlow: '103 232 249' },
  { id: 'emerald', label: 'Emerald', brand: '16 185 129', brandGlow: '52 211 153', accent: '52 211 153', accentGlow: '110 231 183' },
  { id: 'violet', label: 'Violet', brand: '139 92 246', brandGlow: '167 139 250', accent: '167 139 250', accentGlow: '196 181 253' },
  { id: 'amber', label: 'Amber', brand: '245 158 11', brandGlow: '251 191 36', accent: '251 191 36', accentGlow: '252 211 77' },
  { id: 'rose', label: 'Rose', brand: '244 63 94', brandGlow: '251 113 133', accent: '251 113 133', accentGlow: '253 164 175' },
  { id: 'sky', label: 'Sky', brand: '14 165 233', brandGlow: '56 189 248', accent: '56 189 248', accentGlow: '125 211 252' },
  { id: 'magenta', label: 'Magenta', brand: '217 70 239', brandGlow: '232 121 249', accent: '232 121 249', accentGlow: '240 171 252' },
  { id: 'lime', label: 'Lime', brand: '132 204 22', brandGlow: '163 230 53', accent: '163 230 53', accentGlow: '190 242 100' },
  { id: 'crimson', label: 'Crimson', brand: '225 29 72', brandGlow: '244 63 94', accent: '249 115 22', accentGlow: '251 146 60' },
  { id: 'teal', label: 'Teal', brand: '13 148 136', brandGlow: '45 212 191', accent: '45 212 191', accentGlow: '94 234 212' }
]

export function applyTheme(themeId: string): void {
  const t = THEMES.find((x) => x.id === themeId) ?? THEMES[0]
  const root = document.documentElement
  root.style.setProperty('--brand', t.brand)
  root.style.setProperty('--brand-glow', t.brandGlow)
  root.style.setProperty('--accent', t.accent)
  root.style.setProperty('--accent-glow', t.accentGlow)
}

interface SettingsCtx {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => Promise<void>
  loaded: boolean
}

const Ctx = createContext<SettingsCtx>({
  settings: {},
  update: async () => {},
  loaded: false
})

export function SettingsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>({ theme: 'cyan', showTraining: true, apiKeys: {} })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api.settings.get().then((s) => {
      setSettings(s)
      applyTheme(s.theme ?? 'cyan')
      setLoaded(true)
    })
  }, [])

  const update = async (patch: Partial<AppSettings>): Promise<void> => {
    const next = { ...settings, ...patch }
    setSettings(next)
    if (patch.theme) applyTheme(patch.theme)
    const saved = await api.settings.set(patch)
    setSettings(saved)
  }

  return <Ctx.Provider value={{ settings, update, loaded }}>{children}</Ctx.Provider>
}

export function useSettings(): SettingsCtx {
  return useContext(Ctx)
}
