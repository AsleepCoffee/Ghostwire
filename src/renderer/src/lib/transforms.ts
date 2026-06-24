import { api, type EntityType } from './api'
import { generatePivots, subjectForEntity, USERNAME_SITES, type PivotSubject } from './pivot'

/** A transform turns one entity into related entities and/or browser lookups —
 *  the GhostWire take on Maltego's "transforms". */
export interface NewEntity {
  type: EntityType
  label: string
  props?: Record<string, string>
}

export interface TransformOutput {
  entities: NewEntity[]
  urls: string[]
  /** Merge these props onto the source entity. */
  updateSource?: Record<string, string>
  note?: string
}

export interface Transform {
  id: string
  label: string
  description: string
  /** Settings.apiKeys id this transform needs (if any). */
  needsKey?: string
  /** True if it reaches the network (slower, may fail offline). */
  network?: boolean
  run: (
    label: string,
    props: Record<string, string>,
    ctx: { apiKeys: Record<string, string> }
  ) => Promise<TransformOutput>
}

const openLookups = (subject: PivotSubject): Transform['run'] => async (label) => ({
  entities: [],
  urls: generatePivots(subject, label).map((q) => q.url)
})

/** crt.sh subdomain enumeration — free, no key. */
const crtshSubdomains: Transform = {
  id: 'crtsh',
  label: 'Find subdomains (crt.sh)',
  description: 'Pulls subdomains from Certificate Transparency logs and adds them as domain entities. Free, no key.',
  network: true,
  run: async (label) => {
    const data = (await api.net.fetchJson(
      `https://crt.sh/?q=${encodeURIComponent('%.' + label)}&output=json`
    )) as Array<{ name_value?: string }>
    const set = new Set<string>()
    for (const row of data ?? []) {
      for (const raw of String(row.name_value ?? '').split('\n')) {
        const n = raw.trim().toLowerCase()
        if (n && !n.startsWith('*') && n.endsWith(label)) set.add(n)
      }
    }
    set.delete(label)
    const subs = Array.from(set).slice(0, 30)
    return {
      entities: subs.map((s) => ({ type: 'domain' as EntityType, label: s })),
      urls: [],
      note: `crt.sh: added ${subs.length} subdomain${subs.length === 1 ? '' : 's'}`
    }
  }
}

const enc = encodeURIComponent
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

// ---------- API-powered transforms (pull data straight into the graph) ----------
const vtDomainSubdomains: Transform = {
  id: 'vt-subdomains',
  label: 'VirusTotal: subdomains',
  description: 'Fetch known subdomains from VirusTotal and add them as domain entities.',
  needsKey: 'virustotal',
  network: true,
  run: async (label, _p, { apiKeys }) => {
    const data = (await api.net.fetchJson(
      `https://www.virustotal.com/api/v3/domains/${enc(label)}/subdomains?limit=40`,
      { 'x-apikey': apiKeys.virustotal }
    )) as { data?: { id?: string }[] }
    const subs = arr(data.data)
      .map((d) => String((d as { id?: string }).id ?? '').toLowerCase())
      .filter(Boolean)
      .slice(0, 30)
    return { entities: subs.map((s) => ({ type: 'domain' as EntityType, label: s })), urls: [], note: `VirusTotal: ${subs.length} subdomains` }
  }
}

const vtDomainResolutions: Transform = {
  id: 'vt-domain-ips',
  label: 'VirusTotal: resolved IPs',
  description: 'Add the IP addresses this domain has resolved to (passive DNS).',
  needsKey: 'virustotal',
  network: true,
  run: async (label, _p, { apiKeys }) => {
    const data = (await api.net.fetchJson(
      `https://www.virustotal.com/api/v3/domains/${enc(label)}/resolutions?limit=40`,
      { 'x-apikey': apiKeys.virustotal }
    )) as { data?: { attributes?: { ip_address?: string } }[] }
    const ips = Array.from(
      new Set(arr(data.data).map((d) => (d as { attributes?: { ip_address?: string } }).attributes?.ip_address).filter(Boolean) as string[])
    ).slice(0, 30)
    return { entities: ips.map((ip) => ({ type: 'ip' as EntityType, label: ip })), urls: [], note: `VirusTotal: ${ips.length} resolved IPs` }
  }
}

const hunterEmails: Transform = {
  id: 'hunter-emails',
  label: 'Hunter: emails on domain',
  description: 'Pull email addresses found on this domain via Hunter.io.',
  needsKey: 'hunter',
  network: true,
  run: async (label, _p, { apiKeys }) => {
    const data = (await api.net.fetchJson(
      `https://api.hunter.io/v2/domain-search?domain=${enc(label)}&limit=25&api_key=${enc(apiKeys.hunter)}`
    )) as { data?: { emails?: { value?: string }[] } }
    const emails = arr(data.data?.emails)
      .map((e) => String((e as { value?: string }).value ?? ''))
      .filter(Boolean)
      .slice(0, 30)
    return { entities: emails.map((e) => ({ type: 'email' as EntityType, label: e })), urls: [], note: `Hunter: ${emails.length} emails` }
  }
}

const shodanHost: Transform = {
  id: 'shodan-host',
  label: 'Shodan: host details',
  description: 'Open ports, hostnames and org for this IP; adds hostnames as domains.',
  needsKey: 'shodan',
  network: true,
  run: async (label, _p, { apiKeys }) => {
    const d = (await api.net.fetchJson(
      `https://api.shodan.io/shodan/host/${enc(label)}?key=${enc(apiKeys.shodan)}`
    )) as { ports?: number[]; hostnames?: string[]; org?: string; isp?: string; country_name?: string; os?: string }
    const hostnames = arr(d.hostnames).map(String).filter(Boolean).slice(0, 20)
    const ports = arr(d.ports).map(String)
    return {
      entities: hostnames.map((h) => ({ type: 'domain' as EntityType, label: h })),
      urls: [],
      updateSource: {
        ...(ports.length ? { ports: ports.join(', ') } : {}),
        ...(d.org ? { org: d.org } : {}),
        ...(d.isp ? { isp: d.isp } : {}),
        ...(d.country_name ? { country: d.country_name } : {}),
        ...(d.os ? { os: d.os } : {})
      },
      note: `Shodan: ${ports.length} ports, ${hostnames.length} hostnames`
    }
  }
}

const abuseipdbCheck: Transform = {
  id: 'abuseipdb-check',
  label: 'AbuseIPDB: reputation',
  description: 'Attach abuse score, ISP, country and report count to this IP.',
  needsKey: 'abuseipdb',
  network: true,
  run: async (label, _p, { apiKeys }) => {
    const r = (await api.net.fetchJson(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${enc(label)}&maxAgeInDays=90`,
      { Key: apiKeys.abuseipdb, Accept: 'application/json' }
    )) as { data?: { abuseConfidenceScore?: number; isp?: string; countryCode?: string; totalReports?: number; domain?: string } }
    const d = r.data ?? {}
    return {
      entities: d.domain ? [{ type: 'domain' as EntityType, label: d.domain }] : [],
      urls: [],
      updateSource: {
        abuse_score: `${d.abuseConfidenceScore ?? 0}%`,
        ...(d.isp ? { isp: d.isp } : {}),
        ...(d.countryCode ? { country: d.countryCode } : {}),
        reports: String(d.totalReports ?? 0)
      },
      note: `AbuseIPDB: ${d.abuseConfidenceScore ?? 0}% abuse, ${d.totalReports ?? 0} reports`
    }
  }
}

const vtIpResolutions: Transform = {
  id: 'vt-ip-domains',
  label: 'VirusTotal: domains on IP',
  description: 'Add domains that have resolved to this IP (passive DNS).',
  needsKey: 'virustotal',
  network: true,
  run: async (label, _p, { apiKeys }) => {
    const data = (await api.net.fetchJson(
      `https://www.virustotal.com/api/v3/ip_addresses/${enc(label)}/resolutions?limit=40`,
      { 'x-apikey': apiKeys.virustotal }
    )) as { data?: { attributes?: { host_name?: string } }[] }
    const hosts = Array.from(
      new Set(arr(data.data).map((d) => (d as { attributes?: { host_name?: string } }).attributes?.host_name).filter(Boolean) as string[])
    ).slice(0, 30)
    return { entities: hosts.map((h) => ({ type: 'domain' as EntityType, label: h })), urls: [], note: `VirusTotal: ${hosts.length} domains` }
  }
}

const TRANSFORMS: Partial<Record<EntityType, Transform[]>> = {
  domain: [
    crtshSubdomains,
    vtDomainSubdomains,
    vtDomainResolutions,
    hunterEmails,
    {
      id: 'domain-recon',
      label: 'Open recon tools',
      description: 'Open crt.sh, Shodan, Wayback, BuiltWith, exposed-file dorks in browser tabs.',
      run: openLookups('domain')
    }
  ],
  email: [
    {
      id: 'email-domain',
      label: 'Extract domain',
      description: 'Create a domain entity from the email’s domain.',
      run: async (label) => {
        const d = label.split('@')[1]?.trim().toLowerCase()
        return { entities: d ? [{ type: 'domain', label: d }] : [], urls: [], note: d ? '' : 'No domain in address' }
      }
    },
    {
      id: 'email-lookups',
      label: 'Open breach & footprint lookups',
      description: 'HIBP, Epieos, IntelX, paste/doc dorks.',
      run: openLookups('email')
    }
  ],
  username: [
    {
      id: 'username-profiles',
      label: 'Create profile entities',
      description: 'Add a social entity for the username on 14 major platforms (with profile URLs).',
      run: async (label) => {
        const u = label.replace(/^@/, '')
        return {
          entities: USERNAME_SITES.map((s) => ({
            type: 'social' as EntityType,
            label: `${s.label}: ${u}`,
            props: { url: s.url(u) }
          })),
          urls: [],
          note: `Added ${USERNAME_SITES.length} profile entities`
        }
      }
    },
    {
      id: 'username-lookups',
      label: 'Open profile checks',
      description: 'WhatsMyName + Google username search.',
      run: openLookups('username')
    }
  ],
  ip: [
    shodanHost,
    abuseipdbCheck,
    vtIpResolutions,
    {
      id: 'ip-ipinfo',
      label: 'Enrich with IPinfo',
      description: 'Look up org, geo & ASN via IPinfo and attach them (needs IPinfo key).',
      needsKey: 'ipinfo',
      network: true,
      run: async (label, _props, { apiKeys }) => {
        const data = (await api.net.fetchJson(
          `https://ipinfo.io/${encodeURIComponent(label)}/json?token=${apiKeys.ipinfo}`
        )) as Record<string, string>
        const entities: NewEntity[] = []
        const place = [data.city, data.region, data.country].filter(Boolean).join(', ')
        if (place) entities.push({ type: 'location', label: place })
        if (data.org) entities.push({ type: 'organization', label: data.org })
        return {
          entities,
          urls: [],
          updateSource: {
            ...(data.org ? { org: data.org } : {}),
            ...(data.hostname ? { hostname: data.hostname } : {}),
            ...(place ? { location: place } : {})
          },
          note: `IPinfo: ${data.org ?? ''} ${data.country ?? ''}`.trim()
        }
      }
    },
    { id: 'ip-recon', label: 'Open recon tools', description: 'Shodan, Censys, AbuseIPDB, reverse IP.', run: openLookups('ip') }
  ],
  person: [{ id: 'person-search', label: 'Open searches', description: 'Google, LinkedIn, docs, contact dorks.', run: openLookups('name') }],
  phone: [{ id: 'phone-lookups', label: 'Open lookups', description: 'Epieos, Truecaller, social dorks.', run: openLookups('phone') }],
  organization: [{ id: 'org-search', label: 'Open searches', description: 'LinkedIn, employees, OpenCorporates.', run: openLookups('organization') }],
  location: [{ id: 'loc-maps', label: 'Open maps', description: 'Google/Bing/OSM maps.', run: openLookups('location') }],
  social: [{ id: 'social-search', label: 'Open search', description: 'Search this handle on the web.', run: openLookups('username') }],
  image: [{ id: 'image-reverse', label: 'Open reverse-image search', description: 'Yandex, Google Images, TinEye, PimEyes.', run: openLookups('image') }]
}

/** Transforms available for an entity type (always includes a generic "open lookups"). */
export function transformsFor(type: EntityType): Transform[] {
  const list = TRANSFORMS[type]
  if (list && list.length) return list
  return [
    {
      id: 'generic-open',
      label: 'Open lookups',
      description: 'Search this value on the web.',
      run: openLookups(subjectForEntity(type))
    }
  ]
}
