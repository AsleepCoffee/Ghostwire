import { useEffect, useState } from 'react'
import {
  FolderOpen,
  FolderUp,
  Check,
  RefreshCw,
  DownloadCloud,
  ExternalLink,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  PlugZap,
  X,
  AlertTriangle,
  Minus
} from 'lucide-react'
import { api, type UpdateStatus } from '../lib/api'
import { Icon } from '../components/ui'
import { useSettings, THEMES } from '../lib/settings'
import { FREE_SERVICES, PAID_SERVICES, type ApiService } from '../lib/apiServices'
import { VpnManager } from '../components/VpnManager'

type SectionId = 'appearance' | 'features' | 'vpn' | 'email' | 'apikeys' | 'vault' | 'updates' | 'privacy'

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'appearance', label: 'Appearance', icon: 'Palette' },
  { id: 'features', label: 'Features', icon: 'ToggleRight' },
  { id: 'vpn', label: 'VPN', icon: 'Shield' },
  { id: 'email', label: 'Persona email', icon: 'Mail' },
  { id: 'apikeys', label: 'API keys', icon: 'KeyRound' },
  { id: 'vault', label: 'Obsidian vault', icon: 'FolderOpen' },
  { id: 'updates', label: 'Updates', icon: 'RefreshCw' },
  { id: 'privacy', label: 'Data & privacy', icon: 'ShieldCheck' }
]

export function Settings(): JSX.Element {
  const { settings, update } = useSettings()
  const [section, setSection] = useState<SectionId>('appearance')
  const [vaultPath, setVaultPath] = useState<string | undefined>(undefined)
  const [msg, setMsg] = useState('')
  const [version, setVersion] = useState('')
  const [encrypted, setEncrypted] = useState<boolean | null>(null)
  const [upd, setUpd] = useState<UpdateStatus | null>(null)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [showMailPass, setShowMailPass] = useState(false)
  const [tests, setTests] = useState<
    Record<string, { loading?: boolean; status?: 'valid' | 'invalid' | 'error' | 'untestable'; msg?: string }>
  >({})

  const testKey = async (id: string): Promise<void> => {
    const key = (settings.apiKeys ?? {})[id] ?? ''
    setTests((t) => ({ ...t, [id]: { loading: true } }))
    const res = await api.apiKeys.test(id, key)
    setTests((t) => ({ ...t, [id]: { status: res.status, msg: res.message } }))
  }

  const renderKeyRow = (s: ApiService): JSX.Element => {
    const val = (settings.apiKeys ?? {})[s.id] ?? ''
    const show = revealed[s.id]
    const test = tests[s.id] ?? {}
    return (
      <div key={s.id} className="flex items-center gap-3">
        <div className="w-40 shrink-0">
          <div className="text-sm text-slate-200 font-medium flex items-center gap-1">
            {s.name}
            {val && <span className="w-1.5 h-1.5 rounded-full bg-ok" />}
          </div>
          <button
            className="text-[11px] text-brand-glow hover:underline flex items-center gap-0.5"
            onClick={() => api.shell.openExternal(s.signup)}
            title={s.free}
          >
            {s.tier === 'paid' ? 'get a key' : 'get free key'} <ExternalLink size={9} />
          </button>
        </div>
        <div className="relative flex-1">
          <input
            className="input pr-9 font-mono text-xs"
            type={show ? 'text' : 'password'}
            placeholder={s.description}
            value={val}
            onChange={(e) => {
              setKey(s.id, e.target.value)
              setTests((t) => ({ ...t, [s.id]: {} }))
            }}
          />
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            onClick={() => setRevealed((r) => ({ ...r, [s.id]: !r[s.id] }))}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <div className="w-48 shrink-0 flex items-center gap-1.5">
          <button
            className="btn-ghost border border-ink-600 !px-2 !py-1.5 text-xs"
            disabled={!val || test.loading}
            onClick={() => testKey(s.id)}
            title="Test this key"
          >
            {test.loading ? <Loader2 size={13} className="animate-spin" /> : <PlugZap size={13} />} Test
          </button>
          {test.status === 'valid' && (
            <span className="flex items-center gap-1 text-ok text-xs"><Check size={14} /> {test.msg}</span>
          )}
          {test.status === 'invalid' && (
            <span className="flex items-center gap-1 text-danger text-xs truncate" title={test.msg}><X size={14} /> {test.msg}</span>
          )}
          {test.status === 'error' && (
            <span className="flex items-center gap-1 text-warn text-xs truncate" title={test.msg}><AlertTriangle size={14} /> {test.msg}</span>
          )}
          {test.status === 'untestable' && (
            <span className="flex items-center gap-1 text-slate-500 text-xs truncate" title={test.msg}><Minus size={14} /> can’t auto-test</span>
          )}
        </div>
      </div>
    )
  }

  useEffect(() => {
    api.settings.get().then((s) => setVaultPath(s.vaultPath))
    api.app.version().then(setVersion)
    api.app.encryptionStatus().then(setEncrypted)
    return api.updates.onStatus(setUpd)
  }, [])

  const flash = (m: string): void => {
    setMsg(m)
    setTimeout(() => setMsg(''), 2500)
  }

  const pickVault = async (): Promise<void> => {
    const dir = await api.settings.pickVault()
    if (dir) {
      setVaultPath(dir)
      flash('Vault folder set.')
    }
  }

  const setKey = (id: string, value: string): void => {
    update({ apiKeys: { ...(settings.apiKeys ?? {}), [id]: value } })
  }

  const updateLabel = (): string => {
    switch (upd?.state) {
      case 'checking':
        return 'Checking for updates…'
      case 'available':
        return `Update ${upd.version} available — use the prompt to install.`
      case 'downloading':
        return `Downloading… ${upd.percent ?? 0}%`
      case 'ready':
        return `Update ${upd.version} ready to install.`
      case 'none':
        return "You're on the latest version."
      case 'dev':
        return 'Updates only run in the installed app.'
      case 'error':
        return `Update check failed: ${upd.message ?? 'unknown error'}`
      default:
        return ''
    }
  }

  return (
    <div className="h-full flex min-h-0">
      {/* Section rail */}
      <aside className="w-52 shrink-0 border-r border-ink-700 bg-ink-900/50 p-3 overflow-y-auto">
        <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Settings</div>
        <div className="space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                section === s.id
                  ? 'bg-brand/15 text-brand-glow font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-ink-800'
              }`}
            >
              <Icon name={s.icon} size={16} />
              {s.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-slate-600 text-center mt-4">v{version || '…'}</div>
      </aside>

      {/* Section content */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="w-full max-w-6xl mx-auto px-10 py-8 space-y-6">
          {section === 'appearance' && (
            <section className="card p-5">
              <h2 className="font-semibold text-slate-100 mb-1">Appearance</h2>
              <p className="text-sm text-slate-500 mb-4">Each theme reskins the whole app — backgrounds, chrome and accents. Applies instantly.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {THEMES.map((t) => {
                  const active = (settings.theme ?? 'midnight') === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => update({ theme: t.id })}
                      className={`rounded-xl border overflow-hidden text-left transition-all ${
                        active ? 'border-brand shadow-glow' : 'border-ink-700 hover:border-ink-500'
                      }`}
                    >
                      <div className="h-16 relative" style={{ background: `rgb(${t.ink[950]})` }}>
                        <div className="absolute inset-x-2 top-2 h-3 rounded" style={{ background: `rgb(${t.ink[800]})` }} />
                        <div className="absolute left-2 bottom-2 w-8 h-3 rounded" style={{ background: `rgb(${t.brand})` }} />
                        <div className="absolute left-11 bottom-2 w-5 h-3 rounded" style={{ background: `rgb(${t.accent})` }} />
                        {active && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: `rgb(${t.brand})` }}>
                            <Check size={11} className="text-white" />
                          </span>
                        )}
                      </div>
                      <div className="px-2.5 py-1.5" style={{ background: `rgb(${t.ink[900]})` }}>
                        <div className="text-sm font-medium text-slate-100">{t.label}</div>
                        <div className="text-[11px] text-slate-500 truncate">{t.blurb}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {section === 'features' && (
            <section className="card p-5">
              <h2 className="font-semibold text-slate-100 mb-1">Features</h2>
              <p className="text-sm text-slate-500 mb-4">Turn sections on or off.</p>
              <label className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm text-slate-200 font-medium">Course Notes</div>
                  <div className="text-xs text-slate-500">Show the Course Notes shortcut in the sidebar (for the OSINT course).</div>
                </div>
                <Toggle on={settings.showTraining !== false} onChange={(v) => update({ showTraining: v })} />
              </label>
            </section>
          )}

          {section === 'vpn' && (
            <section className="card p-5">
              <h2 className="font-semibold text-slate-100 mb-1 flex items-center gap-2">
                <Icon name="Shield" size={16} className="text-brand-glow" /> VPN exit locations
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Import your Proton WireGuard configs (one per country) to route each sock puppet through a different
                location at the same time. The <b>VPN</b> tab in the sidebar has the full setup guide and live status.
              </p>
              <VpnManager />
            </section>
          )}

          {section === 'email' && (
            <section className="card p-5">
              <h2 className="font-semibold text-slate-100 mb-1 flex items-center gap-2">
                <Icon name="Mail" size={16} className="text-brand-glow" /> Persona email
              </h2>
              <p className="text-sm text-slate-500 mb-3">
                Personas can use a free disposable mailbox (mail.tm) out of the box. If you own a domain with{' '}
                <b>catch-all email</b> (e.g. Cloudflare Email Routing — free), set it here to give personas durable
                addresses like <code className="text-accent">handle@yourdomain.com</code> that won’t be blocked as disposable.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl">
                <div>
                  <label className="label">Catch-all domain (optional)</label>
                  <input
                    className="input"
                    placeholder="yourdomain.com"
                    value={settings.catchAllDomain ?? ''}
                    onChange={(e) => update({ catchAllDomain: e.target.value.trim().replace(/^@/, '') })}
                  />
                </div>
                <div>
                  <label className="label">Dedicated receiving account</label>
                  <input
                    className="input"
                    placeholder="yourcrew.osint@gmail.com"
                    value={settings.personalEmail ?? ''}
                    onChange={(e) => update({ personalEmail: e.target.value.trim() })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Receiving account password (optional — auto sign-in)</label>
                  <div className="relative max-w-md">
                    <input
                      className="input pr-10"
                      type={showMailPass ? 'text' : 'password'}
                      placeholder="Re-fills the webmail login if you get signed out"
                      value={settings.personalEmailPassword ?? ''}
                      onChange={(e) => update({ personalEmailPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      onClick={() => setShowMailPass((v) => !v)}
                      title={showMailPass ? 'Hide' : 'Show'}
                    >
                      {showMailPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-2">
                Use a <b>dedicated</b> account (e.g. a throwaway Gmail), not your personal inbox — catch-all aliases all forward
                there, and you read them from the <b>Mailbox</b> tab (which also has a step-by-step setup guide). The optional
                password is stored locally in plaintext and only auto-fills that account’s webmail login.
              </p>
            </section>
          )}

          {section === 'apikeys' && (
            <section className="card p-5">
              <h2 className="font-semibold text-slate-100 mb-1 flex items-center gap-2">
                <KeyRound size={16} className="text-brand-glow" /> API keys
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Optional and stored locally only. Adding a key unlocks its integration tool and richer graph transforms.
                Use <b>Test</b> to confirm a key works.
              </p>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Free tier</div>
              <div className="space-y-2.5">{FREE_SERVICES.map(renderKeyRow)}</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mt-5 mb-2 flex items-center gap-2">
                Paid <span className="px-1.5 py-0.5 rounded bg-warn/15 text-warn text-[9px] normal-case tracking-normal">requires a subscription</span>
              </div>
              <div className="space-y-2.5">{PAID_SERVICES.map(renderKeyRow)}</div>
            </section>
          )}

          {section === 'vault' && (
            <section className="card p-5">
              <h2 className="font-semibold text-slate-100 mb-1">Obsidian vault</h2>
              <p className="text-sm text-slate-500 mb-4">
                Notes export as Markdown into a <code className="text-accent">GhostWire</code> subfolder of this vault.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 input flex items-center gap-2 font-mono text-xs">
                  <FolderOpen size={15} className="text-slate-500" />
                  <span className="truncate">{vaultPath || 'No vault selected'}</span>
                </div>
                <button className="btn-primary" onClick={pickVault}>
                  <FolderOpen size={16} /> Choose folder
                </button>
              </div>
              <button
                className="btn-ghost border border-ink-600 mt-3"
                onClick={async () => {
                  const res = await api.notes.exportAll()
                  if (res) flash(`Exported ${res.exported} notes to ${res.dir}`)
                }}
                disabled={!vaultPath}
              >
                <FolderUp size={16} /> Export all notes now
              </button>
            </section>
          )}

          {section === 'updates' && (
            <section className="card p-5">
              <h2 className="font-semibold text-slate-100 mb-1">Updates</h2>
              <p className="text-sm text-slate-500 mb-4">
                GhostWire checks GitHub for new releases at launch and installs them automatically.
              </p>
              <div className="flex items-center gap-3">
                <button className="btn-primary" onClick={() => api.updates.check()}>
                  <RefreshCw size={16} /> Check for updates
                </button>
                {upd?.state === 'ready' && (
                  <button className="btn-ghost border border-ok/40 text-ok" onClick={() => api.updates.install()}>
                    <DownloadCloud size={16} /> Restart & install
                  </button>
                )}
                {upd && updateLabel() && <span className="text-sm text-slate-400">{updateLabel()}</span>}
              </div>
            </section>
          )}

          {section === 'privacy' && (
            <section className="card p-5">
              <h2 className="font-semibold text-slate-100 mb-1">Data & privacy</h2>
              <ul className="text-sm text-slate-400 space-y-2 mt-3">
                <li className="flex gap-2">
                  <Check size={16} className="text-ok shrink-0 mt-0.5" /> All data is stored locally in a SQLite
                  database in your app data folder. Nothing is sent to any server (except tools/APIs you invoke).
                </li>
                <li className="flex gap-2">
                  <Check size={16} className="text-ok shrink-0 mt-0.5" /> Each sock puppet has its own isolated
                  browser session so identities never cross-contaminate.
                </li>
                <li className="flex gap-2">
                  {encrypted ? (
                    <>
                      <Check size={16} className="text-ok shrink-0 mt-0.5" /> The database is <b>encrypted at rest</b>.
                    </>
                  ) : (
                    <>
                      <Icon name="TriangleAlert" size={16} className="text-warn shrink-0 mt-0.5" /> Persona credentials,
                      API keys and mailbox passwords are stored unencrypted in the local database — enable OS full-disk
                      encryption (e.g. BitLocker) and keep your device secured.
                    </>
                  )}
                </li>
              </ul>
            </section>
          )}

          {msg && <div className="text-sm text-ok">{msg}</div>}
        </div>
      </div>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${on ? 'bg-brand' : 'bg-ink-600'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  )
}
