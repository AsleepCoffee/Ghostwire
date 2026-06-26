import { useState } from 'react'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { Mail, Phone, Loader2, ShieldAlert, Check, X, Crosshair, Workflow, ExternalLink, UserSearch, Building2, Copy } from 'lucide-react'
import { api, type GravatarResult, type HibpBreach, type HunterResult, type EmailVerify } from '../lib/api'
import { useSettings } from '../lib/settings'
import { useOpenInBrowser } from '../lib/browserBus'
import { PivotModal } from '../components/PivotModal'

const enc = encodeURIComponent
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface EmailReport {
  email: string
  domain: string
  mx: string[]
  gravatar: GravatarResult | null
  hibp: { ok: boolean; error?: string; breaches?: HibpBreach[] } | null
  verify: EmailVerify | null
}

const VERIFY_STYLE: Record<string, string> = {
  deliverable: 'bg-ok/15 text-ok',
  undeliverable: 'bg-danger/15 text-danger',
  risky: 'bg-warn/15 text-warn',
  unknown: 'bg-ink-700 text-slate-400'
}
const VERIFY_LABEL: Record<string, string> = {
  deliverable: 'Deliverable',
  undeliverable: "Doesn't exist",
  risky: 'Risky',
  unknown: 'Unknown'
}

interface PhoneReport {
  input: string
  valid: boolean
  e164?: string
  country?: string
  type?: string
  intl?: string
  national?: string
}

export function Intel(): JSX.Element {
  const { settings } = useSettings()
  const openInBrowser = useOpenInBrowser()
  const [mode, setMode] = useState<'email' | 'phone' | 'company'>('email')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState<EmailReport | null>(null)
  const [phone, setPhone] = useState<PhoneReport | null>(null)
  const [company, setCompany] = useState<HunterResult | null>(null)
  const [verifyMap, setVerifyMap] = useState<Record<string, EmailVerify | 'loading'>>({})
  const [pivot, setPivot] = useState<{ value: string; subject: 'email' | 'phone' } | null>(null)
  const [toast, setToast] = useState('')

  const flash = (m: string): void => {
    setToast(m)
    setTimeout(() => setToast(''), 2600)
  }

  const analyzeEmail = async (): Promise<void> => {
    const e = input.trim().toLowerCase()
    if (!EMAIL_RE.test(e)) {
      flash('That doesn’t look like an email address.')
      return
    }
    setLoading(true)
    setEmail(null)
    const domain = e.split('@')[1]
    try {
      const [mxData, gravatar, hibp, verify] = await Promise.all([
        api.net
          .fetchJson(`https://dns.google/resolve?name=${enc(domain)}&type=MX`)
          .catch(() => ({}) as unknown) as Promise<{ Answer?: { data?: string }[] }>,
        api.intel.gravatar(e),
        settings.apiKeys?.hibp ? api.intel.hibp(e, settings.apiKeys.hibp) : Promise.resolve(null),
        settings.apiKeys?.emailhippo ? api.intel.verifyEmail(e, settings.apiKeys.emailhippo) : Promise.resolve(null)
      ])
      const mx = (mxData.Answer ?? []).map((a) => String(a.data ?? '').replace(/\s+\d+\s*$/, '').trim()).filter(Boolean)
      setEmail({ email: e, domain, mx, gravatar, hibp, verify })
    } finally {
      setLoading(false)
    }
  }

  const analyzePhone = (): void => {
    const parsed = parsePhoneNumberFromString(input.trim())
    if (!parsed) {
      setPhone({ input: input.trim(), valid: false })
      return
    }
    setPhone({
      input: input.trim(),
      valid: parsed.isValid(),
      e164: parsed.number,
      country: parsed.country,
      type: parsed.getType(),
      intl: parsed.formatInternational(),
      national: parsed.formatNational()
    })
  }

  const analyzeCompany = async (): Promise<void> => {
    const q = input.trim()
    if (!q) return
    if (!settings.apiKeys?.hunter) {
      flash('Add a Hunter.io API key in Settings → API keys.')
      return
    }
    setLoading(true)
    setCompany(null)
    setVerifyMap({})
    try {
      const r = await api.intel.hunterDomain(q, settings.apiKeys.hunter)
      setCompany(r)
      if (!r.ok && r.error) flash(r.error)
    } finally {
      setLoading(false)
    }
  }

  const verifyOne = async (addr: string): Promise<void> => {
    if (!settings.apiKeys?.emailhippo) {
      flash('Add an Email Hippo API key in Settings → API keys to verify.')
      return
    }
    setVerifyMap((m) => ({ ...m, [addr]: 'loading' }))
    const r = await api.intel.verifyEmail(addr, settings.apiKeys.emailhippo)
    setVerifyMap((m) => ({ ...m, [addr]: r }))
  }

  const run = (): void => {
    if (mode === 'email') analyzeEmail()
    else if (mode === 'phone') analyzePhone()
    else analyzeCompany()
  }

  const addCompanyToChart = async (): Promise<void> => {
    if (!company?.emails?.length) return
    const projectId = settings.activeProjectId ?? null
    const boards = await api.boards.list()
    let board = boards.find((b) => b.projectId === projectId) ?? boards.find((b) => !projectId && !b.projectId)
    const orgLabel = company.organization || company.domain || 'Company'
    if (!board) board = await api.boards.save({ name: `${orgLabel} — link chart`, projectId })
    const anchor = await api.boards.saveNode({ boardId: board.id, type: 'organization', label: orgLabel, props: company.domain ? { url: `https://${company.domain}` } : {}, x: 0, y: 0 })
    const people = company.emails.slice(0, 24)
    let i = 0
    for (const p of people) {
      const label = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email
      const node = await api.boards.saveNode({
        boardId: board.id,
        type: 'email',
        label: p.email,
        props: { note: [label, p.position].filter(Boolean).join(' — ') },
        x: 300,
        y: (i - (people.length - 1) / 2) * 70
      })
      await api.boards.saveEdge({ boardId: board.id, source: anchor.id, target: node.id, label: p.position || 'email' })
      i++
    }
    flash('Added company to link chart')
  }

  const addToChart = async (label: string, type: 'email' | 'phone', extra: { label: string; url?: string }[] = []): Promise<void> => {
    const projectId = settings.activeProjectId ?? null
    const boards = await api.boards.list()
    let board = boards.find((b) => b.projectId === projectId) ?? boards.find((b) => !projectId && !b.projectId)
    if (!board) board = await api.boards.save({ name: `${label} — link chart`, projectId })
    const anchor = await api.boards.saveNode({ boardId: board.id, type, label, props: {}, x: 0, y: 0 })
    let i = 0
    for (const ex of extra) {
      const node = await api.boards.saveNode({
        boardId: board.id,
        type: 'social',
        label: ex.label,
        props: ex.url ? { url: ex.url } : {},
        x: 280,
        y: (i - (extra.length - 1) / 2) * 80
      })
      await api.boards.saveEdge({ boardId: board.id, source: anchor.id, target: node.id, label: 'account' })
      i++
    }
    flash('Added to link chart')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-ink-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <UserSearch size={20} className="text-brand-glow" /> Email &amp; Phone Intelligence
        </h1>
        <p className="text-sm text-slate-500">Profile an email (Gravatar, breaches, mail server), parse a phone number, or look up a company's people &amp; email pattern (Hunter.io) — then pivot or drop it on the graph.</p>
      </div>

      <div className="px-6 py-3 border-b border-ink-700 flex items-center gap-2">
        <div className="flex rounded-lg border border-ink-600 overflow-hidden">
          <button className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${mode === 'email' ? 'bg-brand/15 text-brand-glow' : 'text-slate-400 hover:bg-ink-800'}`} onClick={() => setMode('email')}>
            <Mail size={14} /> Email
          </button>
          <button className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${mode === 'phone' ? 'bg-brand/15 text-brand-glow' : 'text-slate-400 hover:bg-ink-800'}`} onClick={() => setMode('phone')}>
            <Phone size={14} /> Phone
          </button>
          <button className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${mode === 'company' ? 'bg-brand/15 text-brand-glow' : 'text-slate-400 hover:bg-ink-800'}`} onClick={() => setMode('company')}>
            <Building2 size={14} /> Company
          </button>
        </div>
        <input
          className="input flex-1"
          placeholder={mode === 'email' ? 'name@example.com' : mode === 'phone' ? '+1 415 555 0123 (include country code)' : 'tesla.com or “Tesla”'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
        />
        <button className="btn-primary" disabled={!input.trim() || loading} onClick={run}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <UserSearch size={16} />} Analyze
        </button>
        {(email || phone) && mode !== 'company' && (
          <button
            className="btn-ghost border border-ink-600"
            onClick={() => setPivot({ value: mode === 'email' ? email!.email : phone!.input, subject: mode })}
          >
            <Crosshair size={15} /> Pivot
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        {mode === 'email' && email && (
          <div className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-100">{email.email}</div>
                <button className="btn-ghost border border-ink-600 text-xs" onClick={() => addToChart(email.email, 'email', (email.gravatar?.accounts ?? []).map((a) => ({ label: a.label, url: a.url })))}>
                  <Workflow size={13} /> Add to chart
                </button>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Domain <b className="text-slate-300">{email.domain}</b> ·{' '}
                {email.mx.length ? (
                  <span className="text-ok">accepts mail ({email.mx.length} MX)</span>
                ) : (
                  <span className="text-warn">no MX records (won’t receive mail)</span>
                )}
              </div>
            </div>

            {/* Gravatar */}
            <div className="card p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Gravatar</div>
              {email.gravatar?.found ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {email.gravatar.photos?.[0] && <img src={email.gravatar.photos[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                    <div className="min-w-0">
                      <button className="text-sm text-brand-glow hover:underline" onClick={() => openInBrowser([email.gravatar!.profileUrl!])}>
                        {email.gravatar.displayName || 'Gravatar profile'}
                      </button>
                      {email.gravatar.location && <div className="text-xs text-slate-500">{email.gravatar.location}</div>}
                    </div>
                  </div>
                  {email.gravatar.about && <p className="text-xs text-slate-400">{email.gravatar.about}</p>}
                  {(email.gravatar.accounts ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {email.gravatar.accounts!.map((a) => (
                        <button key={a.url || a.label} className="chip hover:bg-brand/20 hover:text-brand-glow" onClick={() => a.url && openInBrowser([a.url])}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-500">No Gravatar profile for this address.</div>
              )}
            </div>

            {/* Breaches */}
            <div className="card p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                <ShieldAlert size={12} /> Breach exposure (Have I Been Pwned)
              </div>
              {!settings.apiKeys?.hibp ? (
                <div className="text-sm text-slate-500">
                  Add a Have I Been Pwned API key in Settings → API keys to check breaches.
                </div>
              ) : email.hibp?.error ? (
                <div className="text-sm text-danger">{email.hibp.error}</div>
              ) : email.hibp?.breaches && email.hibp.breaches.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-sm text-danger flex items-center gap-1.5">
                    <X size={14} /> Found in {email.hibp.breaches.length} breach{email.hibp.breaches.length === 1 ? '' : 'es'}
                  </div>
                  {email.hibp.breaches.map((b) => (
                    <div key={b.name} className="rounded-lg border border-ink-700 px-3 py-1.5">
                      <div className="text-sm text-slate-200">{b.name} <span className="text-xs text-slate-500">· {b.date}</span></div>
                      {b.classes && <div className="text-[11px] text-slate-500">{b.classes}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-ok flex items-center gap-1.5"><Check size={14} /> No breaches found.</div>
              )}
            </div>

            {/* Deliverability */}
            <div className="card p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                <Mail size={12} /> Deliverability (Email Hippo)
              </div>
              {!settings.apiKeys?.emailhippo ? (
                <div className="text-sm text-slate-500">Add an Email Hippo API key in Settings → API keys to verify the mailbox exists.</div>
              ) : !email.verify ? (
                <div className="text-sm text-slate-500">No verification result.</div>
              ) : !email.verify.ok ? (
                <div className="text-sm text-warn">{email.verify.error || 'Verification failed.'}</div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${VERIFY_STYLE[email.verify.status ?? 'unknown']}`}>
                      {VERIFY_LABEL[email.verify.status ?? 'unknown']}
                    </span>
                    {email.verify.score != null && <span className="text-xs text-slate-500">trust {email.verify.score}/100</span>}
                  </div>
                  {email.verify.reason && <div className="text-xs text-slate-400">{email.verify.reason}</div>}
                  <div className="flex flex-wrap gap-1.5">
                    {email.verify.disposable && <span className="chip text-[10px] text-warn">disposable</span>}
                    {email.verify.role && <span className="chip text-[10px]">role account</span>}
                    {email.verify.free && <span className="chip text-[10px]">free provider</span>}
                    {email.verify.catchAll && <span className="chip text-[10px] text-warn">catch-all domain</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost border border-ink-600 text-xs" onClick={() => openInBrowser([`https://epieos.com/?q=${enc(email.email)}`])}>
                <ExternalLink size={13} /> Epieos
              </button>
              <button className="btn-ghost border border-ink-600 text-xs" onClick={() => openInBrowser([`https://haveibeenpwned.com/account/${enc(email.email)}`])}>
                <ExternalLink size={13} /> HIBP site
              </button>
            </div>
          </div>
        )}

        {mode === 'phone' && phone && (
          <div className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-100">{phone.intl || phone.input}</div>
                <button className="btn-ghost border border-ink-600 text-xs" onClick={() => addToChart(phone.intl || phone.input, 'phone')}>
                  <Workflow size={13} /> Add to chart
                </button>
              </div>
              {phone.valid ? (
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <Field label="Valid" value="Yes" ok />
                  <Field label="Country" value={phone.country ?? '—'} />
                  <Field label="Line type" value={phone.type ?? 'unknown'} />
                  <Field label="E.164" value={phone.e164 ?? '—'} />
                  <Field label="National" value={phone.national ?? '—'} />
                </div>
              ) : (
                <div className="text-sm text-warn mt-2">Couldn’t parse this as a valid number. Include the country code (e.g. +1 …).</div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost border border-ink-600 text-xs" onClick={() => openInBrowser([`https://www.truecaller.com/search/intl/${enc((phone.e164 || phone.input).replace(/[^\d+]/g, ''))}`])}>
                <ExternalLink size={13} /> Truecaller
              </button>
              <button className="btn-ghost border border-ink-600 text-xs" onClick={() => openInBrowser([`https://epieos.com/?q=${enc(phone.e164 || phone.input)}`])}>
                <ExternalLink size={13} /> Epieos
              </button>
            </div>
          </div>
        )}

        {mode === 'company' && company?.ok && (
          <div className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-100 flex items-center gap-2">
                  <Building2 size={16} className="text-brand-glow" />
                  {company.organization || company.domain || input}
                </div>
                {!!company.emails?.length && (
                  <button className="btn-ghost border border-ink-600 text-xs" onClick={addCompanyToChart}>
                    <Workflow size={13} /> Add to chart
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                {company.domain && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Domain</div>
                    <button className="text-sm text-brand-glow hover:underline" onClick={() => openInBrowser([`https://${company.domain}`])}>{company.domain}</button>
                  </div>
                )}
                <Field label="Known emails" value={String(company.total ?? company.emails?.length ?? 0)} />
                {company.pattern && (
                  <div className="col-span-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Email pattern</div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-accent-glow font-mono">{company.pattern}@{company.domain || 'domain'}</code>
                      <button className="text-slate-500 hover:text-accent-glow" title="Copy pattern" onClick={() => api.clipboard.writeText(`${company.pattern}@${company.domain || ''}`)}>
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {company.emails?.length ? (
              <div className="space-y-1.5">
                {[...company.emails].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)).map((p) => {
                  const name = [p.firstName, p.lastName].filter(Boolean).join(' ')
                  const conf = p.confidence ?? 0
                  const confCls = conf >= 80 ? 'text-ok' : conf >= 50 ? 'text-warn' : 'text-slate-500'
                  return (
                    <div key={p.email} className="card p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm text-slate-100 truncate">
                            {name || <span className="text-slate-500">{p.type === 'generic' ? 'Generic address' : 'Unknown name'}</span>}
                            {p.position && <span className="text-slate-500 font-normal"> · {p.position}</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs text-slate-300 font-mono">{p.email}</code>
                            <button className="text-slate-500 hover:text-accent-glow" title="Copy" onClick={() => api.clipboard.writeText(p.email)}><Copy size={11} /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {p.confidence != null && <span className={`text-[11px] ${confCls}`}>{conf}%</span>}
                          {(() => {
                            const v = verifyMap[p.email]
                            if (v === 'loading') return <Loader2 size={13} className="animate-spin text-slate-500" />
                            if (v && v.ok && v.status)
                              return (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${VERIFY_STYLE[v.status]}`} title={v.reason || ''}>
                                  {VERIFY_LABEL[v.status]}
                                </span>
                              )
                            if (v && !v.ok) return <span className="text-[10px] text-warn" title={v.error}>verify failed</span>
                            return (
                              <button className="btn-ghost !p-1.5" title="Verify mailbox (Email Hippo)" onClick={() => verifyOne(p.email)}>
                                <Check size={13} />
                              </button>
                            )
                          })()}
                          {p.linkedin && (
                            <button className="btn-ghost !p-1.5" title="LinkedIn" onClick={() => openInBrowser([p.linkedin!])}><ExternalLink size={13} /></button>
                          )}
                          <button className="btn-ghost !p-1.5" title="Pivot on this email" onClick={() => setPivot({ value: p.email, subject: 'email' })}><Crosshair size={13} /></button>
                        </div>
                      </div>
                      {(p.department || p.seniority || p.type) && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {p.type && <span className="chip text-[10px]">{p.type}</span>}
                          {p.department && <span className="chip text-[10px]">{p.department}</span>}
                          {p.seniority && <span className="chip text-[10px]">{p.seniority}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No public email addresses found for this company on your plan.</div>
            )}
          </div>
        )}

        {mode === 'company' && company && !company.ok && (
          <div className="card p-4 text-sm text-warn">{company.error || 'Search failed.'}</div>
        )}

        {((mode === 'email' && !email) || (mode === 'phone' && !phone) || (mode === 'company' && !company)) && (
          <div className="text-center text-slate-500 mt-20">
            <UserSearch size={32} className="mx-auto mb-3 text-slate-600" />
            {mode === 'company'
              ? 'Enter a company name or domain and hit Analyze.'
              : `Enter an ${mode === 'email' ? 'email address' : 'phone number'} and hit Analyze.`}
          </div>
        )}
      </div>

      <PivotModal open={!!pivot} onClose={() => setPivot(null)} subject={pivot?.subject ?? 'email'} value={pivot?.value ?? ''} />

      {toast && <div className="absolute bottom-5 right-5 z-40 card px-4 py-2.5 text-sm text-slate-200 border-accent/40 shadow-xl">{toast}</div>}
    </div>
  )
}

function Field({ label, value, ok }: { label: string; value: string; ok?: boolean }): JSX.Element {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-sm ${ok ? 'text-ok' : 'text-slate-200'}`}>{value}</div>
    </div>
  )
}
