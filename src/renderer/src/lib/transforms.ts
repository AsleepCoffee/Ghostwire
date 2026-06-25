import { api, type EntityType, type ExifResult } from './api'
import { USERNAME_SITES } from './pivot'

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

const dnsResolve: Transform = {
  id: 'dns-a',
  label: 'DNS: resolve A records',
  description: 'Resolve this domain to IPs via Google DNS-over-HTTPS (free). Adds IP entities.',
  network: true,
  run: async (label) => {
    const d = (await api.net.fetchJson(`https://dns.google/resolve?name=${enc(label)}&type=A`)) as {
      Answer?: { type?: number; data?: string }[]
    }
    const ips = Array.from(
      new Set(arr(d.Answer).filter((a) => (a as { type?: number }).type === 1).map((a) => String((a as { data?: string }).data ?? '')).filter(Boolean))
    ).slice(0, 20)
    return { entities: ips.map((ip) => ({ type: 'ip' as EntityType, label: ip })), urls: [], note: `DNS: ${ips.length} A record(s)` }
  }
}

const waybackLatest: Transform = {
  id: 'wayback',
  label: 'Wayback: latest snapshot',
  description: 'Find the most recent Internet Archive snapshot (free). Adds a document entity.',
  network: true,
  run: async (label) => {
    const u = /^https?:\/\//i.test(label) ? label : `http://${label}`
    const d = (await api.net.fetchJson(`https://archive.org/wayback/available?url=${enc(u)}`)) as {
      archived_snapshots?: { closest?: { url?: string; timestamp?: string } }
    }
    const snap = d.archived_snapshots?.closest
    if (!snap?.url) return { entities: [], urls: [], note: 'No Wayback snapshot found' }
    return {
      entities: [{ type: 'document' as EntityType, label: `Wayback ${snap.timestamp ?? ''}`.trim(), props: { url: snap.url } }],
      urls: [],
      note: 'Added latest Wayback snapshot'
    }
  }
}

const usernameEnum: Transform = {
  id: 'username-enum',
  label: 'Check accounts (live)',
  description: 'Probe major platforms for this username and add only the ones that exist. Best-effort (some sites soft-404).',
  network: true,
  run: async (label) => {
    const u = label.replace(/^@/, '')
    const results = await Promise.all(
      USERNAME_SITES.map(async (s) => {
        const url = s.url(u)
        const status = await api.net.httpStatus(url)
        return { s, url, status }
      })
    )
    const hits = results.filter((r) => r.status >= 200 && r.status < 300)
    return {
      entities: hits.map((r) => ({ type: 'social' as EntityType, label: `${r.s.label}: ${u}`, props: { url: r.url, status: 'found' } })),
      urls: [],
      note: `Found ${hits.length}/${USERNAME_SITES.length} likely accounts`
    }
  }
}

const exifExtract: Transform = {
  id: 'exif',
  label: 'EXIF: GPS & camera',
  description: 'Read embedded metadata from the attached image — GPS becomes a location node; camera/date become properties.',
  run: async (_label, props) => {
    const url = props.image
    if (!url) return { entities: [], urls: [], note: 'No image attached to this entity' }
    const ex = (await api.files.exif(url)) as ExifResult
    const entities: NewEntity[] = []
    if (ex.gps) {
      entities.push({
        type: 'location',
        label: `${ex.gps.lat.toFixed(5)}, ${ex.gps.lng.toFixed(5)}`,
        props: { url: `https://www.google.com/maps?q=${ex.gps.lat},${ex.gps.lng}`, lat: String(ex.gps.lat), lng: String(ex.gps.lng) }
      })
    }
    const updateSource: Record<string, string> = {}
    if (ex.make || ex.model) updateSource.camera = [ex.make, ex.model].filter(Boolean).join(' ')
    if (ex.dateTime) updateSource.taken = ex.dateTime
    if (ex.software) updateSource.software = ex.software
    const found = ex.gps || ex.make || ex.dateTime
    return {
      entities,
      urls: [],
      updateSource,
      note: found ? (ex.gps ? 'EXIF: GPS location + metadata added' : 'EXIF: metadata added (no GPS in image)') : 'No EXIF metadata found'
    }
  }
}

const TRANSFORMS: Partial<Record<EntityType, Transform[]>> = {
  image: [exifExtract],
  domain: [
    crtshSubdomains,
    dnsResolve,
    waybackLatest,
    vtDomainSubdomains,
    vtDomainResolutions,
    hunterEmails
  ],
  email: [
    {
      id: 'email-domain',
      label: 'Extract domain',
      description: 'Create a domain entity from the email’s domain.',
      run: async (label) => {
        const d = label.split('@')[1]?.trim().toLowerCase()
        return { entities: d ? [{ type: 'domain', label: d }] : [], urls: [], note: d ? `Added ${d}` : 'No domain in address' }
      }
    },
    {
      id: 'hunter-verify',
      label: 'Hunter: verify email',
      description: 'Check deliverability/score and attach the result to this email.',
      needsKey: 'hunter',
      network: true,
      run: async (label, _p, { apiKeys }) => {
        const r = (await api.net.fetchJson(
          `https://api.hunter.io/v2/email-verifier?email=${enc(label)}&api_key=${enc(apiKeys.hunter)}`
        )) as { data?: { status?: string; score?: number; result?: string; regexp?: boolean; mx_records?: boolean; smtp_check?: boolean } }
        const d = r.data ?? {}
        const bits = [
          d.result ? `result: ${d.result}` : '',
          d.score != null ? `score ${d.score}` : '',
          d.smtp_check != null ? `SMTP ${d.smtp_check ? 'ok' : 'fail'}` : '',
          d.mx_records != null ? `MX ${d.mx_records ? 'ok' : 'none'}` : ''
        ].filter(Boolean)
        return {
          entities: [],
          urls: [],
          updateSource: {
            ...(d.result ? { verification: d.result } : {}),
            ...(d.status ? { status: d.status } : {}),
            ...(d.score != null ? { score: String(d.score) } : {}),
            ...(d.smtp_check != null ? { smtp_check: String(d.smtp_check) } : {}),
            ...(d.mx_records != null ? { mx_records: String(d.mx_records) } : {})
          },
          note: `Hunter — ${bits.join(', ') || 'checked'}`
        }
      }
    }
  ],
  username: [
    usernameEnum,
    {
      id: 'username-profiles',
      label: 'Add all profile links',
      description: 'Add a social entity for the username on every major platform (unverified, with profile URLs).',
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
    }
  ]
}

/** Transforms that pull data INTO the graph for this entity type.
 *  (Opening web tools is the separate "Pivot" action.) Empty = none yet. */
export function transformsFor(type: EntityType): Transform[] {
  return TRANSFORMS[type] ?? []
}
