import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type AppSettings } from './api'

export interface Theme {
  id: string
  label: string
  /** Short vibe description for the picker. */
  blurb: string
  /** All values are "r g b" triplets consumed by CSS variables. */
  ink: { 950: string; 900: string; 850: string; 800: string; 700: string; 600: string; 500: string }
  brand: string
  brandGlow: string
  accent: string
  accentGlow: string
}

export const THEMES: Theme[] = [
  {
    id: 'midnight',
    label: 'Midnight',
    blurb: 'Blue-black, cyan accents',
    ink: { 950: '7 10 15', 900: '11 14 21', 850: '15 19 28', 800: '20 25 37', 700: '29 36 51', 600: '42 50 66', 500: '58 68 86' },
    brand: '59 130 246',
    brandGlow: '96 165 250',
    accent: '34 211 238',
    accentGlow: '103 232 249'
  },
  {
    id: 'carbon',
    label: 'Carbon',
    blurb: 'Near-black, minimalist grayscale',
    ink: { 950: '10 10 11', 900: '16 16 18', 850: '21 21 24', 800: '27 27 31', 700: '39 39 44', 600: '56 56 62', 500: '82 82 90' },
    brand: '113 113 122',
    brandGlow: '212 212 216',
    accent: '186 230 253',
    accentGlow: '224 242 254'
  },
  {
    id: 'nord',
    label: 'Nord',
    blurb: 'Cool slate-blue, arctic',
    ink: { 950: '36 41 51', 900: '46 52 64', 850: '53 60 74', 800: '59 66 82', 700: '67 76 94', 600: '76 86 106', 500: '94 105 130' },
    brand: '94 129 172',
    brandGlow: '129 161 193',
    accent: '136 192 208',
    accentGlow: '143 188 187'
  },
  {
    id: 'dracula',
    label: 'Dracula',
    blurb: 'Purple-grey, pink accents',
    ink: { 950: '33 34 44', 900: '40 42 54', 850: '45 47 60', 800: '52 54 68', 700: '68 71 90', 600: '88 91 112', 500: '110 114 140' },
    brand: '189 147 249',
    brandGlow: '213 184 252',
    accent: '255 121 198',
    accentGlow: '255 160 213'
  },
  {
    id: 'matrix',
    label: 'Matrix',
    blurb: 'Pure black, terminal green',
    ink: { 950: '3 7 4', 900: '6 12 8', 850: '9 16 11', 800: '13 23 16', 700: '20 36 26', 600: '30 54 39', 500: '45 79 58' },
    brand: '34 197 94',
    brandGlow: '74 222 128',
    accent: '134 239 172',
    accentGlow: '187 247 208'
  },
  {
    id: 'sepia',
    label: 'Sepia',
    blurb: 'Warm charcoal, amber accents',
    ink: { 950: '23 18 14', 900: '30 24 18', 850: '36 29 22', 800: '44 35 27', 700: '61 49 38', 600: '84 67 52', 500: '110 89 70' },
    brand: '217 119 6',
    brandGlow: '245 158 11',
    accent: '251 191 36',
    accentGlow: '253 224 71'
  },
  {
    id: 'crimson',
    label: 'Crimson',
    blurb: 'Dark oxblood, red accents',
    ink: { 950: '15 8 10', 900: '22 12 15', 850: '28 15 19', 800: '36 20 25', 700: '51 28 35', 600: '71 40 49', 500: '99 56 68' },
    brand: '225 29 72',
    brandGlow: '244 63 94',
    accent: '251 113 133',
    accentGlow: '253 164 175'
  },
  {
    id: 'oceanic',
    label: 'Oceanic',
    blurb: 'Deep teal, aqua accents',
    ink: { 950: '6 16 18', 900: '9 22 25', 850: '12 28 31', 800: '16 36 40', 700: '23 52 58', 600: '33 73 80', 500: '48 102 110' },
    brand: '13 148 136',
    brandGlow: '45 212 191',
    accent: '34 211 238',
    accentGlow: '103 232 249'
  },
  {
    id: 'plum',
    label: 'Plum',
    blurb: 'Deep indigo-violet',
    ink: { 950: '12 10 22', 900: '18 15 33', 850: '23 19 42', 800: '30 25 54', 700: '44 37 78', 600: '63 53 110', 500: '88 75 150' },
    brand: '139 92 246',
    brandGlow: '167 139 250',
    accent: '232 121 249',
    accentGlow: '240 171 252'
  }
]

export function applyTheme(themeId: string): void {
  const t = THEMES.find((x) => x.id === themeId) ?? THEMES[0]
  const root = document.documentElement
  root.style.setProperty('--ink-950', t.ink[950])
  root.style.setProperty('--ink-900', t.ink[900])
  root.style.setProperty('--ink-850', t.ink[850])
  root.style.setProperty('--ink-800', t.ink[800])
  root.style.setProperty('--ink-700', t.ink[700])
  root.style.setProperty('--ink-600', t.ink[600])
  root.style.setProperty('--ink-500', t.ink[500])
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
  const [settings, setSettings] = useState<AppSettings>({ theme: 'midnight', showTraining: true, apiKeys: {} })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api.settings.get().then((s) => {
      setSettings(s)
      applyTheme(s.theme ?? 'midnight')
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
