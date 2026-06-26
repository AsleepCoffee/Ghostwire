import { useState } from 'react'
import { Globe, Server, Loader2, Crosshair, Workflow, ExternalLink } from 'lucide-react'
import { api } from '../lib/api'
import { useSettings } from '../lib/settings'
import { useOpenInBrowser } from '../lib/browserBus'
import { PivotModal } from '../components/PivotModal'

const enc = encodeURIComponent
const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}$/i
const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$|:/

async function doh(name: string, type: string): Promise<string[]> {
  try {
    const d = (await api.net.fetchJson(`https://dns.google/resolve?name=${enc(name)}&type=${type}`)) as {
      Answer?: { data?: string }[]
    }
    return (d.Answer ?? []).map((a) => String(a.data ?? '').replace(/"/g, '').trim()).filter(Boolean)
  } catch {
    return []
  }
}

interface DomainReport {
  domain: string
  registrar: string
  created: string
  expires: string
  status: string
  ns: string[]
  a: string[]
  mx: string[]
  txt: string[]
  cname: string[]
  subdomains: string[]
  ip?: { ip: string; org: string; place: string }
}

interface IpReport {
  ip: string
  org: string
  asn: string
  place: string
  network: string
  reverse: string[]
}

export function InfraIntel(): JSX.Element {
  const { settings } = useSettings()
  const openInBrowser = useOpenInBrowser()
  const [mode, setMode] = useState<'domain' | 'ip'>('domain')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [domain, setDomain] = useState<DomainReport | null>(null)
  const [ip, setIp] = useState<IpReport | null>(null)
  const [pivot, setPivot] = useState<{ value: string; subject: 'domain' | 'ip' } | null>(null)
  const [toast, setToast] = useState('')

  const flash = (m: string): void => {
    setToast(m)
    setTimeout(() => setToast(''), 2600)
  }

  const ipInfo = async (addr: string): Promise<{ org: string; asn: string; place: string }> => {
    try {
      const d = (await api.net.fetchJson(`https://ipwho.is/${enc(addr)}`)) as {
        success?: boolean
        city?: string
        region?: string
        country?: string
        connection?: { org?: string; isp?: string; asn?: number }
      }
      if (d.success === false) return { org: '', asn: '', place: '' }
      return {
        org: d.connection?.org || d.connection?.isp || '',
        asn: d.connection?.asn ? `AS${d.connection.asn}` : '',
        place: [d.city, d.region, d.country].filter(Boolean).join(', ')
      }
    } catch {
      return { org: '', asn: '', place: '' }
    }
  }

  const analyzeDomain = async (): Promise<void> => {
    const dom = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!DOMAIN_RE.test(dom)) {
      flash('Enter a valid domain (e.g. example.com).')
      return
    }
    setLoading(true)
    setDomain(null)
    try {
      const [a, mx, ns, txt, cname, rdap, crt] = await Promise.all([
        doh(dom, 'A'),
        doh(dom, 'MX'),
        doh(dom, 'NS'),
        doh(dom, 'TXT'),
        doh(dom, 'CNAME'),
        api.net.fetchJson(`https://rdap.org/domain/${enc(dom)}`).catch(() => null) as Promise<Record<string, unknown> | null>,
        api.net.fetchJson(`https://crt.sh/?q=${enc('%.' + dom)}&output=json`).catch(() => []) as Promise<{ name_value?: string }[]>
      ])
      // RDAP parse
      let registrar = '', created = '', expires = '', status = ''
      if (rdap) {
        const events = (rdap.events as { eventAction?: string; eventDate?: string }[]) ?? []
        created = events.find((e) => e.eventAction === 'registration')?.eventDate ?? ''
        expires = events.find((e) => e.eventAction === 'expiration')?.eventDate ?? ''
        status = ((rdap.status as string[]) ?? []).join(', ')
        const ent = ((rdap.entities as { roles?: string[]; vcardArray?: unknown[] }[]) ?? []).find((e) => e.roles?.includes('registrar'))
        const vcard = ent?.vcardArray?.[1] as unknown[] | undefined
        const fn = (vcard ?? []).find((v) => Array.isArray(v) && v[0] === 'fn') as unknown[] | undefined
        registrar = fn ? String(fn[3] ?? '') : ''
      }
      const subs = Array.from(
        new Set(
          (Array.isArray(crt) ? crt : [])
            .flatMap((r) => String(r.name_value ?? '').split('\n'))
            .map((s) => s.trim().toLowerCase())
            .filter((s) => s && !s.startsWith('*') && s.endsWith(dom) && s !== dom)
        )
      ).slice(0, 40)
      const ipData = a[0] ? await ipInfo(a[0]) : null
      setDomain({
        domain: dom, registrar, created, expires, status, ns, a, mx, txt, cname, subdomains: subs,
        ip: a[0] && ipData ? { ip: a[0], org: ipData.org, place: ipData.place } : undefined
      })
    } finally {
      setLoading(false)
    }
  }

  const analyzeIp = async (): Promise<void> => {
    const addr = input.trim()
    if (!IP_RE.test(addr)) {
      flash('Enter a valid IP address.')
      return
    }
    setLoading(true)
    setIp(null)
    try {
      const info = await ipInfo(addr)
      let network = ''
      const rdap = (await api.net.fetchJson(`https://rdap.org/ip/${enc(addr)}`).catch(() => null)) as Record<string, unknown> | null
      if (rdap) network = `${String(rdap.name ?? '')} ${String(rdap.handle ?? '')}`.trim()
      const ptr = await doh(addr.split('.').reverse().join('.') + '.in-addr.arpa', 'PTR')
      setIp({ ip: addr, org: info.org, asn: info.asn, place: info.place, network, reverse: ptr })
    } finally {
      setLoading(false)
    }
  }

  const addDomainToChart = async (d: DomainReport): Promise<void> => {
    const projectId = settings.activeProjectId ?? null
    const boards = await api.boards.list()
    let board = boards.find((b) => b.projectId === projectId) ?? boards.find((b) => !projectId && !b.projectId)
    if (!board) board = await api.boards.save({ name: `${d.domain} — link chart`, projectId })
    const anchor = await api.boards.saveNode({ boardId: board.id, type: 'domain', label: d.domain, props: {}, x: 0, y: 0 })
    const adds: { type: 'ip' | 'domain' | 'email'; label: string }[] = [
      ...d.a.map((x) => ({ type: 'ip' as const, label: x })),
      ...d.subdomains.slice(0, 15).map((x) => ({ type: 'domain' as const, label: x }))
    ]
    let i = 0
    for (const ad of adds) {
      const node = await api.boards.saveNode({ boardId: board.id, type: ad.type, label: ad.label, props: {}, x: 280, y: (i - (adds.length - 1) / 2) * 70 })
      await api.boards.saveEdge({ boardId: board.id, source: anchor.id, target: node.id })
      i++
    }
    flash(`Added ${adds.length + 1} nodes to the link chart`)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-ink-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Server size={20} className="text-brand-glow" /> Domain &amp; Infrastructure
        </h1>
        <p className="text-sm text-slate-500">WHOIS, DNS, subdomains and hosting for a domain — or geolocation &amp; network for an IP. No key needed.</p>
      </div>

      <div className="px-6 py-3 border-b border-ink-700 flex items-center gap-2">
        <div className="flex rounded-lg border border-ink-600 overflow-hidden">
          <button className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${mode === 'domain' ? 'bg-brand/15 text-brand-glow' : 'text-slate-400 hover:bg-ink-800'}`} onClick={() => setMode('domain')}>
            <Globe size={14} /> Domain
          </button>
          <button className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${mode === 'ip' ? 'bg-brand/15 text-brand-glow' : 'text-slate-400 hover:bg-ink-800'}`} onClick={() => setMode('ip')}>
            <Server size={14} /> IP
          </button>
        </div>
        <input
          className="input flex-1"
          placeholder={mode === 'domain' ? 'example.com' : '8.8.8.8'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (mode === 'domain' ? analyzeDomain() : analyzeIp())}
        />
        <button className="btn-primary" disabled={!input.trim() || loading} onClick={() => (mode === 'domain' ? analyzeDomain() : analyzeIp())}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />} Analyze
        </button>
        {(domain || ip) && (
          <button className="btn-ghost border border-ink-600" onClick={() => setPivot({ value: mode === 'domain' ? domain!.domain : ip!.ip, subject: mode })}>
            <Crosshair size={15} /> Pivot
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl space-y-4">
        {mode === 'domain' && domain && (
          <>
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-100">{domain.domain}</div>
                <button className="btn-ghost border border-ink-600 text-xs" onClick={() => addDomainToChart(domain)}>
                  <Workflow size={13} /> Add to chart
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <Field label="Registrar" value={domain.registrar || '—'} />
                <Field label="Created" value={domain.created ? domain.created.slice(0, 10) : '—'} />
                <Field label="Expires" value={domain.expires ? domain.expires.slice(0, 10) : '—'} />
                <Field label="Hosting" value={domain.ip ? `${domain.ip.org || domain.ip.ip} · ${domain.ip.place}` : '—'} />
              </div>
            </div>

            <Records title="A records" items={domain.a} />
            <Records title="Mail (MX)" items={domain.mx} />
            <Records title="Name servers" items={domain.ns} />
            <Records title="TXT (SPF/DMARC/verification)" items={domain.txt} />
            {domain.cname.length > 0 && <Records title="CNAME" items={domain.cname} />}

            <div className="card p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Subdomains (crt.sh) · {domain.subdomains.length}</div>
              {domain.subdomains.length === 0 ? (
                <div className="text-sm text-slate-500">None found in certificate transparency.</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {domain.subdomains.map((s) => (
                    <button key={s} className="chip hover:bg-brand/20 hover:text-brand-glow" onClick={() => openInBrowser([`https://${s}`])}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Ext label="Wayback" onClick={() => openInBrowser([`https://web.archive.org/web/*/${domain.domain}`])} />
              <Ext label="ViewDNS" onClick={() => openInBrowser([`https://viewdns.info/whois/?domain=${enc(domain.domain)}`])} />
              <Ext label="urlscan" onClick={() => openInBrowser([`https://urlscan.io/domain/${enc(domain.domain)}`])} />
            </div>
          </>
        )}

        {mode === 'ip' && ip && (
          <>
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-100">{ip.ip}</div>
                <button
                  className="btn-ghost border border-ink-600 text-xs"
                  onClick={async () => {
                    const projectId = settings.activeProjectId ?? null
                    const boards = await api.boards.list()
                    let board = boards.find((b) => b.projectId === projectId) ?? boards.find((b) => !projectId && !b.projectId)
                    if (!board) board = await api.boards.save({ name: `${ip.ip} — link chart`, projectId })
                    await api.boards.saveNode({ boardId: board.id, type: 'ip', label: ip.ip, props: { org: ip.org, location: ip.place }, x: 0, y: 0 })
                    flash('Added to link chart')
                  }}
                >
                  <Workflow size={13} /> Add to chart
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <Field label="Organization" value={ip.org || '—'} />
                <Field label="ASN" value={ip.asn || '—'} />
                <Field label="Location" value={ip.place || '—'} />
                <Field label="Network" value={ip.network || '—'} />
                <Field label="Reverse DNS" value={ip.reverse[0] || '—'} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Ext label="Shodan" onClick={() => openInBrowser([`https://www.shodan.io/host/${enc(ip.ip)}`])} />
              <Ext label="AbuseIPDB" onClick={() => openInBrowser([`https://www.abuseipdb.com/check/${enc(ip.ip)}`])} />
              <Ext label="Reverse IP (ViewDNS)" onClick={() => openInBrowser([`https://viewdns.info/reverseip/?host=${enc(ip.ip)}`])} />
            </div>
          </>
        )}

        {!domain && !ip && (
          <div className="text-center text-slate-500 mt-20">
            <Server size={32} className="mx-auto mb-3 text-slate-600" />
            Enter a {mode} and hit Analyze.
          </div>
        )}
      </div>

      <PivotModal open={!!pivot} onClose={() => setPivot(null)} subject={pivot?.subject ?? 'domain'} value={pivot?.value ?? ''} />
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

function Records({ title, items }: { title: string; items: string[] }): JSX.Element {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">{title} · {items.length}</div>
      {items.length === 0 ? (
        <div className="text-sm text-slate-500">None</div>
      ) : (
        <div className="space-y-1">
          {items.map((r, i) => (
            <div key={i} className="text-sm text-slate-300 font-mono break-all">{r}</div>
          ))}
        </div>
      )}
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
