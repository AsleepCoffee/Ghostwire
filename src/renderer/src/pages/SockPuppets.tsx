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
  Zap,
  KeyRound,
  RefreshCw
} from 'lucide-react'
import { api, type Persona, type PersonaAccount, type PersonaStatus, type Project } from '../lib/api'
import {
  generateIdentity,
  personaColor,
  buildStarterAccounts,
  generatePassword,
  loginUrlFor
} from '../lib/constants'
import { Modal, StatusBadge, EmptyState } from '../components/ui'
import { PivotModal } from '../components/PivotModal'
import { useOpenInBrowser, useOpenTabs } from '../lib/browserBus'
import { useConfirm } from '../lib/confirm'
import type { PivotSubject } from '../lib/pivot'

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
  const openInBrowser = useOpenInBrowser()
  const openTabs = useOpenTabs()
  const confirm = useConfirm()

  const load = async (): Promise<void> => setPersonas(await api.personas.list())
  useEffect(() => {
    load()
  }, [])

  const browseAs = (p: Persona): void => openInBrowser(['https://duckduckgo.com/'], p.id)

  const loginToAccount = (p: Persona, a: PersonaAccount): void =>
    openTabs([
      {
        url: loginUrlFor(a.platform, a.url),
        personaId: p.id,
        autofill: { username: a.username, password: a.password }
      }
    ])

  const quickCreate = async (): Promise<void> => {
    const g = generateIdentity()
    const saved = await api.personas.save({
      name: g.name,
      handle: g.handle,
      status: 'active',
      gender: g.gender,
      birthdate: g.birthdate,
      location: g.location,
      occupation: g.occupation,
      email: g.email,
      backstory: g.backstory,
      accounts: buildStarterAccounts(g.handle, g.email),
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
          <button className="btn-ghost border border-ink-600" onClick={quickCreate} title="Generate a full persona with accounts & passwords">
            <Zap size={16} /> Quick create
          </button>
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
                onLogin={(a) => loginToAccount(p, a)}
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
          onLogin={editing.id ? (a) => loginToAccount(editing as Persona, a) : undefined}
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
  onPivot
}: {
  p: Persona
  onEdit: () => void
  onDelete: () => void
  onBrowse: () => void
  onLogin: (a: PersonaAccount) => void
  onPivot: () => void
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
  const set = (patch: Partial<Persona>): void => setP((prev) => ({ ...prev, ...patch }))

  useEffect(() => {
    api.projects.list().then(setProjects)
  }, [])

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
                <ImagePlus size={15} /> {p.avatarPath ? 'Change' : 'Upload'} avatar
              </button>
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

        {/* Accounts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label !mb-0">Linked accounts & credentials</label>
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
                  className="input col-span-3"
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
                <div className="col-span-2 flex items-center gap-1 justify-end">
                  <button
                    className="btn-ghost !px-1.5"
                    title="Generate password"
                    onClick={() => updateAccount(i, { password: generatePassword() })}
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    className="btn-ghost !px-1.5 text-accent disabled:opacity-30"
                    title={onLogin ? 'Open & log in as this persona' : 'Save persona first to log in'}
                    disabled={!onLogin}
                    onClick={() => onLogin?.(a)}
                  >
                    <LogIn size={15} />
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
  )
}
