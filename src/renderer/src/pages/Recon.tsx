import { useMemo, useState } from 'react'
import { Radar, Loader2, Search, ExternalLink, Workflow, CheckSquare, Square, Globe, Server, Mail, Building2 } from 'lucide-react'
import { api, type ReconResult } from '../lib/api'
import { useSettings } from '../lib/settings'
import { useOpenInBrowser } from '../lib/browserBus'
import { addToInvestigation, type AddEntity } from '../lib/investigation'

const enc = encodeURIComponent

export function Recon(): JSX.Element {
  const { settings } = useSettings()
  const openInBrowser = useOpenInBrowser()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<ReconResult | null>(null)
  const [error, setError] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState('')

  const flash = (m: string): void => {
    setToast(m)
    setTimeout(() => setToast(''), 3000)
  }

  // Every selectable finding, keyed by "type:label".
  const registry = useMemo(() => {
    const m = new Map<string, AddEntity>()
    if (!res) return m
    for (const h of res.hosts) m.set(`domain:${h.host}`, { type: 'domain', label: h.host })
    for (const ip of res.ips) m.set(`ip:${ip}`, { type: 'ip', label: ip })
    for (const em of res.emails) m.set(`email:${em}`, { type: 'email', label: em })
    if (res.whois.org) m.set(`organization:${res.whois.org}`, { type: 'organization', label: res.whois.org })
    return m
  }, [res])

  const run = async (): Promise<void> => {
    const dom = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!dom) return
    setError('')
    setRes(null)
    setSel(new Set())
    setLoading(true)
    try {
      const r = await api.intel.reconDomain(dom)
      if (!r.ok) {
        setError(r.error || 'Recon failed.')
        return
      }
      setRes(r)
      // Pre-select everything that's alive + all IPs (the useful pivots).
      const pre = new Set<string>()
      for (const h of r.hosts) if (h.alive) pre.add(`domain:${h.host}`)
      for (const ip of r.ips) pre.add(`ip:${ip}`)
      setSel(pre)
    } finally {
      setLoading(false)
    }
  }

  const toggle = (k: string): void =>
    setSel((s) => {
      const n = new Set(s)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })
  const selectKeys = (keys: string[], on: boolean): void =>
    setSel((s) => {
      const n = new Set(s)
      for (const k of keys) (on ? n.add(k) : n.delete(k))
      return n
    })

  const addSelected = async (): Promise<void> => {
    if (!res || sel.size === 0) return
    setAdding(true)
    try {
      const entities = [...sel].map((k) => registry.get(k)).filter((e): e is AddEntity => !!e)
      const r = await addToInvestigation({
        projectId: settings.activeProjectId ?? null,
        anchor: { type: 'domain', label: res.domain },
        entities
      })
      flash(
        settings.activeProjectId
          ? `Added ${r.nodes} new node${r.nodes === 1 ? '' : 's'} (${r.links} auto-links) to the investigation`
          : `Added ${r.nodes} node${r.nodes === 1 ? '' : 's'} to a chart — set an active investigation to file them`
      )
    } finally {
      setAdding(false)
    }
  }

  const Row = ({ k, label, sub, onOpen }: { k: string; label: string; sub?: string; onOpen?: () => void }): JSX.Element => {
    const on = sel.has(k)
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-ink-800/60">
        <button onClick={() => toggle(k)} className={on ? 'text-accent-glow' : 'text-slate-500'}>
          {on ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>
        <button className="font-mono text-sm text-slate-200 truncate hover:text-brand-glow text-left flex-1" onClick={onOpen} title={onOpen ? 'Open in browser' : undefined}>
          {label}
        </button>
        {sub && <span className="text-[11px] text-slate-500 shrink-0 truncate max-w-[45%]">{sub}</span>}
      </div>
    )
  }

  const aliveHosts = res?.hosts.filter((h) => h.alive) ?? []
  const deadHosts = res?.hosts.filter((h) => !h.alive) ?? []

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-ink-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Radar size={20} className="text-brand-glow" /> Domain Recon
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          One-shot passive recon — runs the equivalent of <span className="font-mono">subfinder + assetfinder + amass + httprobe</span>{' '}
          together: subdomains from several certificate-transparency / passive-DNS sources, plus DNS, WHOIS and HTTP liveness.
          Tick what's useful and push it to the investigation. No keys, no installs.
        </p>
      </div>

      <div className="px-6 py-3 border-b border-ink-700 flex items-center gap-2">
        <input className="input flex-1" placeholder="example.com" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />
        <button className="btn-primary" onClick={run} disabled={!input.trim() || loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Run recon
        </button>
        {res && (
          <button className="btn-primary" onClick={addSelected} disabled={sel.size === 0 || adding}>
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Workflow size={16} />} Add {sel.size} to investigation
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl">
        {loading && (
          <div className="text-slate-400 text-sm flex items-center gap-2">
            <Loader2 size={15} className="animate-spin" /> Enumerating sources and probing hosts… this can take ~20–40s.
          </div>
        )}
        {error && <div className="card p-3 text-sm text-warn">{error}</div>}

        {res && (
          <>
            {/* WHOIS + DNS summary */}
            <div className="card p-4">
              <div className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
                <Globe size={16} className="text-brand-glow" /> {res.domain}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <Field label="Registrar" value={res.whois.registrar || '—'} />
                <Field label="Registrant org" value={res.whois.org || '—'} />
                <Field label="Created" value={res.whois.created?.slice(0, 10) || '—'} />
                <Field label="Expires" value={res.whois.expires?.slice(0, 10) || '—'} />
                <Field label="A records" value={res.dns.a.join(', ') || '—'} />
                <Field label="Mail (MX)" value={res.dns.mx.map((m) => m.split(' ').pop()).join(', ') || '—'} />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Ext label="Wayback" onClick={() => openInBrowser([`https://web.archive.org/web/*/${res.domain}`])} />
                <Ext label="urlscan" onClick={() => openInBrowser([`https://urlscan.io/domain/${enc(res.domain)}`])} />
                <Ext label="Web Check" onClick={() => openInBrowser([`https://web-check.as93.net/check/${enc(res.domain)}`])} />
                <Ext label="crt.sh" onClick={() => openInBrowser([`https://crt.sh/?q=${enc('%.' + res.domain)}`])} />
              </div>
              <div className="text-[11px] text-slate-500 mt-3">
                Sources:{' '}
                {Object.entries(res.sources)
                  .map(([k, v]) => `${k} ${v}`)
                  .join(' · ')}
              </div>
            </div>

            {/* Hosts */}
            <div className="card p-3">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Server size={12} /> Hosts · {aliveHosts.length} live / {res.hosts.length} found
                </div>
                <div className="flex gap-2 text-[11px]">
                  <button className="text-slate-400 hover:text-brand-glow" onClick={() => selectKeys(aliveHosts.map((h) => `domain:${h.host}`), true)}>select live</button>
                  <button className="text-slate-400 hover:text-brand-glow" onClick={() => selectKeys(res.hosts.map((h) => `domain:${h.host}`), false)}>clear</button>
                </div>
              </div>
              {[...aliveHosts, ...deadHosts].map((h) => (
                <Row
                  key={h.host}
                  k={`domain:${h.host}`}
                  label={h.host}
                  sub={h.alive ? [`${h.scheme}·${h.status}`, h.ip, h.title].filter(Boolean).join('  ·  ') : h.ip || 'no response'}
                  onOpen={h.alive ? () => openInBrowser([`${h.scheme}://${h.host}`]) : undefined}
                />
              ))}
              {!res.hosts.length && <div className="text-sm text-slate-500 px-2 py-1">No subdomains found.</div>}
            </div>

            {/* IPs */}
            {res.ips.length > 0 && (
              <div className="card p-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-1.5 px-1">
                  <Server size={12} /> IP addresses · {res.ips.length}
                </div>
                {res.ips.map((ip) => (
                  <Row key={ip} k={`ip:${ip}`} label={ip} onOpen={() => openInBrowser([`https://www.shodan.io/host/${enc(ip)}`])} />
                ))}
              </div>
            )}

            {/* Emails + org */}
            {(res.emails.length > 0 || res.whois.org) && (
              <div className="card p-3">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1.5 px-1">WHOIS contacts</div>
                {res.whois.org && <Row k={`organization:${res.whois.org}`} label={res.whois.org} sub="registrant org" />}
                {res.emails.map((em) => (
                  <Row key={em} k={`email:${em}`} label={em} />
                ))}
              </div>
            )}
          </>
        )}

        {!res && !loading && !error && (
          <div className="text-center text-slate-500 mt-16">
            <Radar size={32} className="mx-auto mb-3 text-slate-600" />
            Enter a domain and hit “Run recon”.
            <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-slate-600">
              <span className="flex items-center gap-1"><Globe size={12} /> subdomains</span>
              <span className="flex items-center gap-1"><Server size={12} /> liveness + IPs</span>
              <span className="flex items-center gap-1"><Building2 size={12} /> WHOIS</span>
              <span className="flex items-center gap-1"><Mail size={12} /> contacts</span>
            </div>
          </div>
        )}
      </div>

      {toast && <div className="absolute bottom-5 right-5 z-40 card px-4 py-2.5 text-sm text-slate-200 border-accent/40 shadow-xl">{toast}</div>}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm text-slate-200 break-words">{value}</div>
    </div>
  )
}

function Ext({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <button className="btn-ghost border border-ink-600 text-xs" onClick={onClick}>
      <ExternalLink size={13} /> {label}
    </button>
  )
}
