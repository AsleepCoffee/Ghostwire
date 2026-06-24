import { useEffect, useState } from 'react'
import { FolderOpen, FolderUp, Check } from 'lucide-react'
import { api, type AppSettings } from '../lib/api'
import { Icon } from '../components/ui'

export function Settings(): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>({})
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.settings.get().then(setSettings)
  }, [])

  const pickVault = async (): Promise<void> => {
    const dir = await api.settings.pickVault()
    if (dir) {
      setSettings((s) => ({ ...s, vaultPath: dir }))
      setMsg('Vault folder set.')
      setTimeout(() => setMsg(''), 2000)
    }
  }

  const exportAll = async (): Promise<void> => {
    const res = await api.notes.exportAll()
    if (res) setMsg(`Exported ${res.exported} notes to ${res.dir}`)
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Icon name="Settings" size={22} className="text-brand-glow" /> Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure GhostWire and your Obsidian export.</p>
        </div>

        <section className="card p-5">
          <h2 className="font-semibold text-slate-100 mb-1">Obsidian vault</h2>
          <p className="text-sm text-slate-500 mb-4">
            Notes export as Markdown with YAML frontmatter into a <code className="text-accent">GhostWire</code>{' '}
            subfolder of this vault.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 input flex items-center gap-2 font-mono text-xs">
              <FolderOpen size={15} className="text-slate-500" />
              <span className="truncate">{settings.vaultPath || 'No vault selected'}</span>
            </div>
            <button className="btn-primary" onClick={pickVault}>
              <FolderOpen size={16} /> Choose folder
            </button>
          </div>
          <button className="btn-ghost border border-ink-600 mt-3" onClick={exportAll} disabled={!settings.vaultPath}>
            <FolderUp size={16} /> Export all notes now
          </button>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-slate-100 mb-1">Data & privacy</h2>
          <ul className="text-sm text-slate-400 space-y-2 mt-3">
            <li className="flex gap-2">
              <Check size={16} className="text-ok shrink-0 mt-0.5" /> All data is stored locally in a SQLite
              database in your app data folder. Nothing is sent to any server.
            </li>
            <li className="flex gap-2">
              <Check size={16} className="text-ok shrink-0 mt-0.5" /> Each sock puppet has its own isolated
              browser session (cookies, storage) so identities never cross-contaminate.
            </li>
            <li className="flex gap-2">
              <Icon name="TriangleAlert" size={16} className="text-warn shrink-0 mt-0.5" /> Persona credentials
              are stored in plaintext — keep your device encrypted and secured.
            </li>
          </ul>
        </section>

        {msg && <div className="text-sm text-ok">{msg}</div>}

        <div className="text-center text-xs text-slate-600 pt-4">
          GhostWire · OSINT Workbench · v0.1.0
        </div>
      </div>
    </div>
  )
}
