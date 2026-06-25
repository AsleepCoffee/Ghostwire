import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Trash2,
  Wand2,
  Globe,
  Copy,
  Fingerprint,
  X,
  Pencil,
  Crosshair,
  ImagePlus,
  LogIn,
  UserPlus,
  Pin,
  Zap,
  RefreshCw,
  Mail,
  Inbox,
  Loader2,
  CheckCircle2,
  Check,
  Circle,
  Dices
} from 'lucide-react'
import {
  api,
  type Persona,
  type PersonaAccount,
  type PersonaStatus,
  type Project,
  type PersonaMailbox,
  type MailMessage,
  type MailMessageFull,
  type VpnConfigStatus
} from '../lib/api'
import {
  generateIdentity,
  personaColor,
  buildStarterAccounts,
  generatePassword,
  loginUrlFor,
  signupUrlFor,
  COUNTRIES
} from '../lib/constants'
import { Modal, StatusBadge, EmptyState } from '../components/ui'
import { PivotModal } from '../components/PivotModal'
import { useOpenInBrowser, useOpenTabs, type Autofill } from '../lib/browserBus'
import { useConfirm } from '../lib/confirm'
import { useSettings } from '../lib/settings'
import { usePersonaDock } from '../lib/dock'
import { identityFields, identityText } from '../lib/identity'
import { CopyField } from '../components/CopyField'
import type { PivotSubject } from '../lib/pivot'

/** Build a full autofill payload from a persona + the specific account being opened.
 *  Powers both logins and sign-up forms (name, email, birthday, gender, …). */
function personaAutofill(p: Persona, a: PersonaAccount): Autofill {
  const parts = (p.name ?? '').trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? ''
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : ''
  // For the Email account itself, the "username" is usually the address; otherwise prefer the handle.
  const username = a.username || (a.platform.toLowerCase() === 'email' ? p.email ?? '' : p.handle ?? '')
  return {
    username,
    password: a.password,
    email: p.email ?? (username.includes('@') ? username : undefined),
    firstName,
    lastName,
    fullName: p.name,
    birthdate: p.birthdate,
    gender: p.gender,
    phone: p.phone
  }
}

/** A grid of click-to-copy persona details for filling sign-up forms by hand
 *  when a site's autofill doesn't catch every field. */
function IdentityCopyPanel({ p }: { p: Partial<Persona> }): JSX.Element {
  const [copiedAll, setCopiedAll] = useState(false)
  const fields = identityFields(p)

  const copyAll = async (): Promise<void> => {
    await api.clipboard.writeText(identityText(p))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1400)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label !mb-0">Identity — click any field to copy</label>
        <button type="button" className="btn-ghost text-xs" onClick={copyAll}>
          {copiedAll ? <Check size={14} className="text-ok" /> : <Copy size={14} />} Copy all
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {fields.map((f) => (
          <CopyField key={f.label} label={f.label} value={f.value} />
        ))}
      </div>
    </div>
  )
}

const EMPTY: Partial<Persona> = {
  name: '',
  handle: '',
  status: 'draft',
  accounts: [],
  tags: []
}

export function SockPuppets(): JSX.Element {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Partial<Persona> | null>(null)
  const [pivot, setPivot] = useState<{ value: string; subject: PivotSubject } | null>(null)
  const [country, setCountry] = useState<string>('any')
  const openInBrowser = useOpenInBrowser()
  const openTabs = useOpenTabs()
  const confirm = useConfirm()
  const { settings } = useSettings()
  const dock = usePersonaDock()

  const load = async (): Promise<void> => setPersonas(await api.personas.list())
  useEffect(() => {
    load()
  }, [])

  const browseAs = (p: Persona): void => openInBrowser(['https://duckduckgo.com/'], p.id)

  // Not created yet → open the sign-up page; already created → open login.
  // Either way the persona's details (name, DOB, email, password…) are autofilled,
  // and we pin the persona to the side dock so its info stays handy on the Browser tab.
  const openAccount = (p: Persona, a: PersonaAccount): void => {
    dock.pin(p)
    openTabs([
      {
        url: a.status === 'created' ? loginUrlFor(a.platform, a.url) : signupUrlFor(a.platform, a.url),
        personaId: p.id,
        autofill: personaAutofill(p, a)
      }
    ])
  }

  const quickCreate = async (): Promise<void> => {
    const g = generateIdentity(country)
    let avatarPath: string | null = null
    try {
      avatarPath = await api.files.randomAvatar()
    } catch {
      /* avatar is best-effort */
    }
    // Prefer the user's catch-all domain (durable alias) for the persona's email when set.
    const domain = settings.catchAllDomain
    const email = domain ? `${g.handle.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@${domain}` : g.email
    const mailbox = domain
      ? { provider: 'catchall' as const, address: email, password: generatePassword(), createdAt: Date.now() }
      : null
    const saved = await api.personas.save({
      name: g.name,
      handle: g.handle,
      status: 'active',
      gender: g.gender,
      birthdate: g.birthdate,
      location: g.location,
      nationality: g.nationality,
      phone: g.phone,
      occupation: g.occupation,
      email,
      backstory: g.backstory,
      avatarPath,
      mailbox,
      accounts: buildStarterAccounts(g.handle, email),
      tags: ['generated']
    })
    await load()
    setEditing(saved)
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return personas.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [personas, query])

  const remove = async (p: Persona): Promise<void> => {
    const ok = await confirm({
      title: `Delete persona “${p.name}”?`,
      message: 'This removes the persona from GhostWire. Its browser session data is not deleted automatically.',
      confirmText: 'Delete',
      danger: true
    })
    if (!ok) return
    await api.personas.remove(p.id)
    load()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Fingerprint size={20} className="text-brand-glow" /> Sock Puppet Manager
          </h1>
          <p className="text-sm text-slate-500">
            Manage personas with fully isolated browser sessions — log into the same site as many identities at once.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-ink-600 overflow-hidden">
            <button className="btn-ghost !rounded-none border-0" onClick={quickCreate} title="Generate a full persona with accounts, passwords & a localised identity">
              <Zap size={16} /> Quick create
            </button>
            <select
              className="bg-ink-850 border-0 border-l border-ink-600 text-sm text-slate-300 px-2 focus:outline-none focus:ring-0 cursor-pointer"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              title="Country for the generated location, nationality & phone"
            >
              <option value="any">🌍 Any country</option>
              {Object.entries(COUNTRIES).map(([k, c]) => (
                <option key={k} value={k}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}>
            <Plus size={16} /> New Persona
          </button>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-ink-700">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Search personas, handles, tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon="Drama"
            title="No personas yet"
            subtitle="Create a sock puppet to manage its identity details and isolated browsing session."
            action={
              <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}>
                <Plus size={16} /> Create your first persona
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <PersonaCard
                key={p.id}
                p={p}
                onEdit={() => setEditing(p)}
                onDelete={() => remove(p)}
                onBrowse={() => browseAs(p)}
                onLogin={(a) => openAccount(p, a)}
                onPin={() => dock.pin(p)}
                onPivot={() =>
                  setPivot({ value: p.handle || p.name, subject: p.handle ? 'username' : 'name' })
                }
              />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <PersonaEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
          onLogin={editing.id ? (a) => openAccount(editing as Persona, a) : undefined}
        />
      )}

      <PivotModal
        open={!!pivot}
        onClose={() => setPivot(null)}
        subject={pivot?.subject ?? 'username'}
        value={pivot?.value ?? ''}
      />
    </div>
  )
}

function PersonaCard({
  p,
  onEdit,
  onDelete,
  onBrowse,
  onLogin,
  onPivot,
  onPin
}: {
  p: Persona
  onEdit: () => void
  onDelete: () => void
  onBrowse: () => void
  onLogin: (a: PersonaAccount) => void
  onPivot: () => void
  onPin: () => void
}): JSX.Element {
  const color = personaColor(p.id)
  return (
    <div className="card p-4 hover:border-ink-600 transition-colors group">
      <div className="flex items-start gap-3">
        {p.avatarPath ? (
          <img
            src={p.avatarPath}
            alt={p.name}
            className="w-11 h-11 rounded-xl object-cover shrink-0"
            style={{ border: `1px solid ${color}55` }}
          />
        ) : (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color}22`, border: `1px solid ${color}55` }}
          >
            <Fingerprint size={22} style={{ color }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-100 truncate">{p.name || 'Unnamed'}</h3>
            <StatusBadge status={p.status} />
          </div>
          <div className="text-sm text-slate-500 truncate">@{p.handle || '—'}</div>
        </div>
      </div>

      {(p.location || p.occupation) && (
        <div className="mt-3 text-xs text-slate-500 space-y-0.5">
          {p.occupation && <div>💼 {p.occupation}</div>}
          {p.location && <div>📍 {p.location}</div>}
        </div>
      )}

      {p.accounts.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Click to log in as this persona</div>
          <div className="flex flex-wrap gap-1">
            {p.accounts.map((a, i) => (
              <button
                key={i}
                onClick={() => onLogin(a)}
                title={`Open ${a.platform} & autofill${a.username ? ` (${a.username})` : ''}`}
                className="chip hover:bg-brand/20 hover:text-brand-glow transition-colors"
              >
                <LogIn size={11} /> {a.platform}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-1.5 pt-3 border-t border-ink-700">
        <button className="btn-primary flex-1 justify-center" onClick={onBrowse}>
          <Globe size={15} /> Browse as
        </button>
        <button className="btn-ghost !px-2" onClick={onPin} title="Pin details to the side dock (stays visible while you browse)">
          <Pin size={16} />
        </button>
        <button className="btn-ghost !px-2" onClick={onPivot} title="Search this persona everywhere">
          <Crosshair size={16} />
        </button>
        <button className="btn-ghost !px-2" onClick={onEdit} title="Edit">
          <Pencil size={16} />
        </button>
        <button className="btn-danger !px-2" onClick={onDelete} title="Delete">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

function PersonaEditor({
  initial,
  onClose,
  onSaved,
  onLogin
}: {
  initial: Partial<Persona>
  onClose: () => void
  onSaved: () => void
  onLogin?: (a: PersonaAccount) => void
}): JSX.Element {
  const [p, setP] = useState<Partial<Persona>>({ ...initial })
  const [tagInput, setTagInput] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [vpnConfigs, setVpnConfigs] = useState<VpnConfigStatus[]>([])
  const [genMail, setGenMail] = useState(false)
  const [mailErr, setMailErr] = useState('')
  const [inboxOpen, setInboxOpen] = useState(false)
  const [genAvatar, setGenAvatar] = useState(false)
  const { settings } = useSettings()

  const randomAvatar = async (): Promise<void> => {
    setGenAvatar(true)
    setMailErr('')
    try {
      const url = await api.files.randomAvatar()
      if (url) set({ avatarPath: url })
      else setMailErr('Could not fetch a face right now — try again, or use Upload.')
    } finally {
      setGenAvatar(false)
    }
  }
  const set = (patch: Partial<Persona>): void => setP((prev) => ({ ...prev, ...patch }))

  useEffect(() => {
    api.projects.list().then(setProjects)
    api.vpn.state().then((s) => setVpnConfigs(s.configs))
  }, [])

  const genMailbox = async (): Promise<void> => {
    setGenMail(true)
    setMailErr('')
    try {
      const mb = await api.mail.create(p.handle)
      set({ mailbox: mb, email: mb.address })
    } catch (e) {
      setMailErr(`Couldn't create mailbox: ${String((e as Error)?.message ?? e)}`)
    } finally {
      setGenMail(false)
    }
  }

  const genCatchAll = (): void => {
    const domain = settings.catchAllDomain
    if (!domain) return
    const local = (p.handle || `gw${Math.random().toString(36).slice(2, 8)}`)
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '')
    const address = `${local}@${domain}`
    set({
      mailbox: { provider: 'catchall', address, password: generatePassword(), createdAt: Date.now() },
      email: address
    })
    setMailErr('')
  }

  const fillRandom = (): void => {
    const g = generateIdentity()
    set({
      name: g.name,
      handle: g.handle,
      gender: g.gender,
      birthdate: g.birthdate,
      location: g.location,
      occupation: g.occupation,
      email: g.email,
      backstory: g.backstory,
      status: p.status ?? 'draft'
    })
  }

  const addTag = (): void => {
    const t = tagInput.trim()
    if (!t) return
    if (!(p.tags ?? []).includes(t)) set({ tags: [...(p.tags ?? []), t] })
    setTagInput('')
  }

  const updateAccount = (i: number, patch: Partial<PersonaAccount>): void => {
    const accounts = [...(p.accounts ?? [])]
    accounts[i] = { ...accounts[i], ...patch }
    set({ accounts })
  }
  const addAccount = (): void =>
    set({ accounts: [...(p.accounts ?? []), { platform: '', username: '', url: '', password: '' }] })
  const removeAccount = (i: number): void =>
    set({ accounts: (p.accounts ?? []).filter((_, idx) => idx !== i) })

  const save = async (): Promise<void> => {
    await api.personas.save(p)
    onSaved()
  }

  return (
    <>
    {inboxOpen && p.mailbox && <MailboxInbox mailbox={p.mailbox} onClose={() => setInboxOpen(false)} />}
    <Modal open onClose={onClose} title={initial.id ? 'Edit persona' : 'New persona'} wide>
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {p.avatarPath ? (
              <img src={p.avatarPath} alt="avatar" className="w-14 h-14 rounded-xl object-cover border border-ink-600" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-ink-800 border border-ink-700 flex items-center justify-center">
                <Fingerprint size={24} className="text-slate-500" />
              </div>
            )}
            <div className="flex gap-2">
              <button
                className="btn-ghost border border-ink-600"
                onClick={async () => {
                  const url = await api.files.pickImage('avatars')
                  if (url) set({ avatarPath: url })
                }}
              >
                <ImagePlus size={15} /> {p.avatarPath ? 'Change' : 'Upload'}
              </button>
              <button className="btn-ghost border border-ink-600" disabled={genAvatar} onClick={randomAvatar} title="Generate a random AI face">
                {genAvatar ? <Loader2 size={15} className="animate-spin" /> : <Dices size={15} />} Random face
              </button>
              {p.avatarPath && (
                <button
                  className="btn-ghost border border-ink-600"
                  onClick={() => api.files.saveCopy(p.avatarPath!, `${(p.handle || 'persona')}-avatar.jpg`)}
                  title="Save the image to upload to social profiles"
                >
                  <ImagePlus size={15} /> Save image
                </button>
              )}
              {p.avatarPath && (
                <button className="btn-ghost text-slate-500" onClick={() => set({ avatarPath: null })}>
                  Remove
                </button>
              )}
            </div>
          </div>
          <button className="btn-ghost border border-ink-600" onClick={fillRandom}>
            <Wand2 size={15} /> Generate identity
          </button>
        </div>

        {/* Disposable mailbox */}
        <div className="card !bg-ink-900 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Mail size={15} className="text-brand-glow shrink-0" />
              {p.mailbox ? (
                <span className="font-mono text-slate-200 truncate">{p.mailbox.address}</span>
              ) : (
                <span className="text-slate-500">Generate a disposable inbox to receive sign-up emails</span>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              {p.mailbox ? (
                <>
                  <button className="btn-ghost !px-2 text-xs" onClick={() => navigator.clipboard.writeText(p.mailbox!.address)}>
                    <Copy size={13} /> Copy
                  </button>
                  {p.mailbox.provider === 'mailtm' && (
                    <button className="btn-ghost border border-ink-600 text-xs" onClick={() => setInboxOpen(true)}>
                      <Inbox size={14} /> Inbox
                    </button>
                  )}
                  <button className="btn-ghost !px-2 text-xs text-slate-500" onClick={() => set({ mailbox: null })} title="Clear mailbox">
                    <X size={13} />
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-ghost border border-ink-600 text-xs" disabled={genMail} onClick={genMailbox}>
                    {genMail ? <Loader2 size={13} className="animate-spin" /> : <Mail size={14} />} mail.tm
                  </button>
                  {settings.catchAllDomain && (
                    <button className="btn-ghost border border-ink-600 text-xs" onClick={genCatchAll}>
                      <Mail size={14} /> @{settings.catchAllDomain}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {mailErr && <p className="text-xs text-danger mt-2">{mailErr}</p>}
          {p.mailbox && (
            <p className="text-[11px] text-slate-600 mt-2">
              {p.mailbox.provider === 'mailtm'
                ? 'Disposable mail.tm inbox · readable here · some sites block disposable domains.'
                : 'Catch-all address on your domain · durable · verification mail lands in your domain’s inbox.'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={p.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <label className="label">Handle / username</label>
            <input className="input" value={p.handle ?? ''} onChange={(e) => set({ handle: e.target.value })} />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={p.status ?? 'draft'}
              onChange={(e) => set({ status: e.target.value as PersonaStatus })}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="burned">Burned</option>
            </select>
          </div>
          <div>
            <label className="label">Investigation</label>
            <select
              className="input"
              value={p.projectId ?? ''}
              onChange={(e) => set({ projectId: e.target.value || null })}
            >
              <option value="">— none —</option>
              {projects.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">VPN exit country</label>
            <select
              className="input"
              value={p.vpnConfigId ?? ''}
              onChange={(e) => set({ vpnConfigId: e.target.value || null })}
            >
              <option value="">— none (use your real connection) —</option>
              {vpnConfigs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.running ? '' : ' (tunnel down)'}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-600 mt-1">
              {vpnConfigs.length === 0
                ? 'Import Proton WireGuard configs in the VPN tab to route this persona through another country.'
                : 'This persona’s browser tabs will exit from the selected country. Fails closed if its tunnel is down.'}
            </p>
          </div>
          <div>
            <label className="label">Gender</label>
            <input className="input" value={p.gender ?? ''} onChange={(e) => set({ gender: e.target.value })} />
          </div>
          <div>
            <label className="label">Birthdate</label>
            <input className="input" type="date" value={p.birthdate ?? ''} onChange={(e) => set({ birthdate: e.target.value })} />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={p.location ?? ''} onChange={(e) => set({ location: e.target.value })} />
          </div>
          <div>
            <label className="label">Occupation</label>
            <input className="input" value={p.occupation ?? ''} onChange={(e) => set({ occupation: e.target.value })} />
          </div>
          <div>
            <label className="label">Nationality</label>
            <input className="input" value={p.nationality ?? ''} onChange={(e) => set({ nationality: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={p.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={p.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label">Backstory / notes</label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={p.backstory ?? ''}
            onChange={(e) => set({ backstory: e.target.value })}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(p.tags ?? []).map((t) => (
              <span key={t} className="chip">
                {t}
                <button onClick={() => set({ tags: (p.tags ?? []).filter((x) => x !== t) })}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <input
            className="input"
            placeholder="Type a tag and press Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
        </div>

        {/* Quick-copy identity for manual sign-up forms */}
        <IdentityCopyPanel p={p} />

        {/* Accounts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label !mb-0">
              Linked accounts & credentials{' '}
              <span className="text-slate-500 normal-case">
                ({(p.accounts ?? []).filter((a) => a.status === 'created').length}/{(p.accounts ?? []).length} created)
              </span>
            </label>
            <div className="flex gap-2">
              <button
                className="btn-ghost text-xs"
                onClick={() => set({ accounts: buildStarterAccounts(p.handle ?? 'user', p.email ?? '') })}
                title="Generate a starter set of accounts with passwords"
              >
                <Zap size={14} /> Generate set
              </button>
              <button className="btn-ghost text-xs" onClick={addAccount}>
                <Plus size={14} /> Add account
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {(p.accounts ?? []).map((a, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="input col-span-2"
                  placeholder="Platform"
                  value={a.platform}
                  onChange={(e) => updateAccount(i, { platform: e.target.value })}
                />
                <input
                  className="input col-span-3"
                  placeholder="Username / email"
                  value={a.username ?? ''}
                  onChange={(e) => updateAccount(i, { username: e.target.value })}
                />
                <input
                  className="input col-span-2"
                  placeholder="Password"
                  value={a.password ?? ''}
                  onChange={(e) => updateAccount(i, { password: e.target.value })}
                />
                <input
                  className="input col-span-2"
                  placeholder="URL (optional)"
                  value={a.url ?? ''}
                  onChange={(e) => updateAccount(i, { url: e.target.value })}
                />
                <div className="col-span-3 flex items-center gap-1 justify-end">
                  <button
                    className={`btn-ghost !px-1.5 ${a.status === 'created' ? 'text-ok' : 'text-slate-500'}`}
                    title={a.status === 'created' ? 'Created ✓ — click to mark not made' : 'Not created yet — click when registered'}
                    onClick={() => updateAccount(i, { status: a.status === 'created' ? 'planned' : 'created' })}
                  >
                    {a.status === 'created' ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  </button>
                  <button
                    className="btn-ghost !px-1.5"
                    title="Generate password"
                    onClick={() => updateAccount(i, { password: generatePassword() })}
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    className="btn-ghost !px-1.5 text-accent disabled:opacity-30"
                    title={
                      !onLogin
                        ? 'Save the persona first, then open the site'
                        : a.status === 'created'
                          ? 'Open the login page & autofill credentials'
                          : 'Open the sign-up page & autofill the persona’s details'
                    }
                    disabled={!onLogin}
                    onClick={() => onLogin?.(a)}
                  >
                    {a.status === 'created' ? <LogIn size={15} /> : <UserPlus size={15} />}
                  </button>
                  <button className="btn-danger !px-1.5" onClick={() => removeAccount(i)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            {(p.accounts ?? []).length === 0 && (
              <p className="text-xs text-slate-500">No linked accounts yet.</p>
            )}
          </div>
          <p className="text-[11px] text-slate-600 mt-2 flex items-center gap-1">
            <Copy size={11} /> Credentials are stored locally in plaintext in your GhostWire database — keep your device secured.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-ink-700">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" onClick={save}>
          Save persona
        </button>
      </div>
    </Modal>
    </>
  )
}

function MailboxInbox({ mailbox, onClose }: { mailbox: PersonaMailbox; onClose: () => void }): JSX.Element {
  const [msgs, setMsgs] = useState<MailMessage[]>([])
  const [sel, setSel] = useState<MailMessageFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const load = async (): Promise<void> => {
    setLoading(true)
    setErr('')
    try {
      setMsgs(await api.mail.messages(mailbox.token ?? '', mailbox.base))
    } catch (e) {
      setErr(String((e as Error)?.message ?? e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Modal open onClose={onClose} title={`Inbox — ${mailbox.address}`} wide>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-slate-500">{msgs.length} message{msgs.length === 1 ? '' : 's'}</div>
        <button className="btn-ghost border border-ink-600 text-xs" onClick={load} disabled={loading}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
        </button>
      </div>
      {err && <p className="text-xs text-danger mb-2">{err}</p>}
      <div className="grid grid-cols-2 gap-3 max-h-[60vh]">
        <div className="overflow-y-auto border border-ink-700 rounded-lg divide-y divide-ink-800">
          {msgs.length === 0 && !loading && (
            <div className="p-4 text-sm text-slate-500 text-center">No mail yet — register somewhere, then Refresh.</div>
          )}
          {msgs.map((m) => (
            <button
              key={m.id}
              onClick={async () => setSel(await api.mail.message(mailbox.token ?? '', m.id, mailbox.base))}
              className={`w-full text-left px-3 py-2 hover:bg-ink-800 ${sel?.id === m.id ? 'bg-ink-800' : ''}`}
            >
              <div className="text-sm font-medium text-slate-200 truncate">{m.subject}</div>
              <div className="text-xs text-slate-500 truncate">{m.from}</div>
            </button>
          ))}
        </div>
        <div className="overflow-y-auto border border-ink-700 rounded-lg p-3">
          {sel ? (
            <>
              <div className="text-sm font-semibold text-slate-100">{sel.subject}</div>
              <div className="text-xs text-slate-500 mb-2">{sel.from}</div>
              <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words font-sans">{sel.text || sel.intro || '(no text body)'}</pre>
            </>
          ) : (
            <div className="text-sm text-slate-500 text-center pt-8">Select a message to read it.</div>
          )}
        </div>
      </div>
    </Modal>
  )
}
