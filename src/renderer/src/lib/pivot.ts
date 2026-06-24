import type { EntityType } from './api'

export type PivotSubject =
  | 'name'
  | 'username'
  | 'email'
  | 'phone'
  | 'domain'
  | 'ip'
  | 'organization'
  | 'location'
  | 'image'
  | 'generic'

export interface PivotQuery {
  label: string
  url: string
  group: string
}

const enc = encodeURIComponent
const g = (q: string): string => `https://www.google.com/search?q=${enc(q)}`

/** Map a graph entity type to a pivot subject. */
export function subjectForEntity(t: EntityType): PivotSubject {
  switch (t) {
    case 'person':
      return 'name'
    case 'username':
    case 'social':
      return 'username'
    case 'email':
      return 'email'
    case 'phone':
      return 'phone'
    case 'domain':
      return 'domain'
    case 'ip':
      return 'ip'
    case 'organization':
      return 'organization'
    case 'location':
      return 'location'
    case 'image':
      return 'image'
    default:
      return 'generic'
  }
}

export const SUBJECT_LABELS: Record<PivotSubject, string> = {
  name: 'Person name',
  username: 'Username / handle',
  email: 'Email address',
  phone: 'Phone number',
  domain: 'Domain',
  ip: 'IP address',
  organization: 'Organization',
  location: 'Location',
  image: 'Image (reverse search)',
  generic: 'Anything'
}

/** Platforms whose profile pages map directly to a username. */
const USERNAME_SITES: { label: string; url: (u: string) => string }[] = [
  { label: 'X / Twitter', url: (u) => `https://twitter.com/${u}` },
  { label: 'Instagram', url: (u) => `https://www.instagram.com/${u}/` },
  { label: 'GitHub', url: (u) => `https://github.com/${u}` },
  { label: 'Reddit', url: (u) => `https://www.reddit.com/user/${u}` },
  { label: 'TikTok', url: (u) => `https://www.tiktok.com/@${u}` },
  { label: 'YouTube', url: (u) => `https://www.youtube.com/@${u}` },
  { label: 'Facebook', url: (u) => `https://www.facebook.com/${u}` },
  { label: 'Telegram', url: (u) => `https://t.me/${u}` },
  { label: 'Twitch', url: (u) => `https://www.twitch.tv/${u}` },
  { label: 'Pinterest', url: (u) => `https://www.pinterest.com/${u}/` },
  { label: 'Steam', url: (u) => `https://steamcommunity.com/id/${u}` },
  { label: 'Medium', url: (u) => `https://medium.com/@${u}` },
  { label: 'Keybase', url: (u) => `https://keybase.io/${u}` },
  { label: 'Gravatar', url: (u) => `https://gravatar.com/${u}` }
]

/** Build the full pivot query set for a value. */
export function generatePivots(subject: PivotSubject, raw: string): PivotQuery[] {
  const v = raw.trim()
  if (!v) return []
  const out: PivotQuery[] = []
  const exact = `"${v}"`

  switch (subject) {
    case 'username': {
      const u = v.replace(/^@/, '')
      out.push({ group: 'Search', label: `Google "${u}"`, url: g(exact) })
      out.push({ group: 'Search', label: 'WhatsMyName', url: 'https://whatsmyname.app/' })
      out.push({ group: 'Search', label: 'Google — accounts', url: g(`${exact} (profile OR account OR "@${u}")`) })
      for (const s of USERNAME_SITES) out.push({ group: 'Profiles', label: s.label, url: s.url(u) })
      break
    }
    case 'email': {
      out.push({ group: 'Search', label: `Google "${v}"`, url: g(exact) })
      out.push({ group: 'Breach', label: 'Have I Been Pwned', url: 'https://haveibeenpwned.com/' })
      out.push({ group: 'Breach', label: 'Epieos', url: `https://epieos.com/?q=${enc(v)}` })
      out.push({ group: 'Breach', label: 'IntelX', url: `https://intelx.io/?s=${enc(v)}` })
      out.push({ group: 'Search', label: 'Google — pastes', url: g(`${exact} (site:pastebin.com OR site:ghostbin.com)`) })
      out.push({ group: 'Search', label: 'Google — docs', url: g(`${exact} (filetype:pdf OR filetype:xlsx OR filetype:csv)`) })
      const domain = v.split('@')[1]
      if (domain) out.push({ group: 'Search', label: `Same domain (${domain})`, url: g(`"@${domain}"`) })
      break
    }
    case 'name': {
      out.push({ group: 'Search', label: `Google "${v}"`, url: g(exact) })
      out.push({ group: 'Social', label: 'LinkedIn', url: g(`${exact} site:linkedin.com`) })
      out.push({ group: 'Social', label: 'Facebook', url: `https://www.facebook.com/search/top?q=${enc(v)}` })
      out.push({ group: 'Search', label: 'Google — profiles', url: g(`${exact} (profile OR bio OR about)`) })
      out.push({ group: 'Search', label: 'Google — docs', url: g(`${exact} (filetype:pdf OR filetype:doc OR filetype:pptx)`) })
      out.push({ group: 'Search', label: 'Google — contact', url: g(`${exact} (email OR contact OR phone)`) })
      break
    }
    case 'phone': {
      out.push({ group: 'Search', label: `Google "${v}"`, url: g(exact) })
      const digits = v.replace(/[^\d+]/g, '')
      out.push({ group: 'Search', label: 'Google (digits)', url: g(`"${digits}"`) })
      out.push({ group: 'Lookup', label: 'Epieos', url: `https://epieos.com/?q=${enc(v)}` })
      out.push({ group: 'Lookup', label: 'Truecaller', url: `https://www.truecaller.com/search/intl/${enc(digits)}` })
      out.push({ group: 'Search', label: 'Google — social', url: g(`"${digits}" (whatsapp OR telegram OR contact)`) })
      break
    }
    case 'domain': {
      out.push({ group: 'Recon', label: 'crt.sh (subdomains)', url: `https://crt.sh/?q=${enc(v)}` })
      out.push({ group: 'Recon', label: 'Shodan', url: `https://www.shodan.io/search?query=${enc(v)}` })
      out.push({ group: 'Recon', label: 'Wayback Machine', url: `https://web.archive.org/web/*/${enc(v)}` })
      out.push({ group: 'Recon', label: 'BuiltWith', url: `https://builtwith.com/${enc(v)}` })
      out.push({ group: 'Recon', label: 'ViewDNS', url: `https://viewdns.info/whois/?domain=${enc(v)}` })
      out.push({ group: 'Recon', label: 'urlscan.io', url: `https://urlscan.io/domain/${enc(v)}` })
      out.push({ group: 'Search', label: `Google site:${v}`, url: g(`site:${v}`) })
      out.push({ group: 'Search', label: 'Google — exposed', url: g(`site:${v} (intitle:index.of OR ext:env OR ext:sql OR ext:log)`) })
      break
    }
    case 'ip': {
      out.push({ group: 'Recon', label: 'Shodan', url: `https://www.shodan.io/host/${enc(v)}` })
      out.push({ group: 'Recon', label: 'Censys', url: `https://search.censys.io/hosts/${enc(v)}` })
      out.push({ group: 'Recon', label: 'AbuseIPDB', url: `https://www.abuseipdb.com/check/${enc(v)}` })
      out.push({ group: 'Recon', label: 'ViewDNS reverse IP', url: `https://viewdns.info/reverseip/?host=${enc(v)}` })
      out.push({ group: 'Recon', label: 'urlscan.io', url: `https://urlscan.io/search/#ip:${enc(v)}` })
      break
    }
    case 'organization': {
      out.push({ group: 'Search', label: `Google "${v}"`, url: g(exact) })
      out.push({ group: 'Search', label: 'LinkedIn company', url: g(`${exact} site:linkedin.com/company`) })
      out.push({ group: 'Search', label: 'Employees', url: g(`${exact} (site:linkedin.com/in)`) })
      out.push({ group: 'Search', label: 'Docs', url: g(`${exact} (filetype:pdf OR filetype:xlsx)`) })
      out.push({ group: 'Recon', label: 'OpenCorporates', url: `https://opencorporates.com/companies?q=${enc(v)}` })
      break
    }
    case 'location': {
      out.push({ group: 'Maps', label: 'Google Maps', url: `https://www.google.com/maps/search/${enc(v)}` })
      out.push({ group: 'Maps', label: 'Bing Maps', url: `https://www.bing.com/maps?q=${enc(v)}` })
      out.push({ group: 'Maps', label: 'OpenStreetMap', url: `https://www.openstreetmap.org/search?query=${enc(v)}` })
      out.push({ group: 'Search', label: 'Google', url: g(exact) })
      break
    }
    case 'image': {
      out.push({ group: 'Reverse', label: 'Google Images', url: 'https://images.google.com/' })
      out.push({ group: 'Reverse', label: 'Yandex Images', url: 'https://yandex.com/images/' })
      out.push({ group: 'Reverse', label: 'TinEye', url: 'https://tineye.com/' })
      out.push({ group: 'Reverse', label: 'PimEyes (faces)', url: 'https://pimeyes.com/en' })
      break
    }
    default: {
      out.push({ group: 'Search', label: `Google "${v}"`, url: g(exact) })
      out.push({ group: 'Search', label: 'DuckDuckGo', url: `https://duckduckgo.com/?q=${enc(v)}` })
      out.push({ group: 'Search', label: 'Bing', url: `https://www.bing.com/search?q=${enc(v)}` })
    }
  }
  return out
}

// ---------- Google dork builder ----------
export interface DorkParams {
  terms: string
  exact: string
  site: string
  intitle: string
  inurl: string
  filetype: string
  orTerms: string
  exclude: string
}

export const EMPTY_DORK: DorkParams = {
  terms: '',
  exact: '',
  site: '',
  intitle: '',
  inurl: '',
  filetype: '',
  orTerms: '',
  exclude: ''
}

export function buildDorkQuery(p: DorkParams): string {
  const parts: string[] = []
  if (p.terms.trim()) parts.push(p.terms.trim())
  if (p.exact.trim()) parts.push(`"${p.exact.trim()}"`)
  if (p.site.trim()) parts.push(`site:${p.site.trim()}`)
  if (p.intitle.trim()) parts.push(`intitle:${p.intitle.trim()}`)
  if (p.inurl.trim()) parts.push(`inurl:${p.inurl.trim()}`)
  if (p.filetype.trim()) parts.push(`filetype:${p.filetype.trim()}`)
  if (p.orTerms.trim()) {
    const ors = p.orTerms
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (ors.length) parts.push(`(${ors.join(' OR ')})`)
  }
  if (p.exclude.trim()) {
    for (const ex of p.exclude.split(',').map((s) => s.trim()).filter(Boolean)) parts.push(`-${ex}`)
  }
  return parts.join(' ')
}

export function dorkUrl(query: string): string {
  return `https://www.google.com/search?q=${enc(query)}`
}

/** Common ready-made dork templates. {V} is replaced by the user's value. */
export const DORK_TEMPLATES: { label: string; build: (v: string) => string }[] = [
  { label: 'Exposed directories', build: (v) => `site:${v} intitle:"index of"` },
  { label: 'Env / config files', build: (v) => `site:${v} (ext:env OR ext:ini OR ext:cfg OR ext:conf)` },
  { label: 'SQL / DB dumps', build: (v) => `site:${v} (ext:sql OR ext:db OR ext:bak)` },
  { label: 'Login pages', build: (v) => `site:${v} (inurl:login OR inurl:signin OR intitle:login)` },
  { label: 'Documents', build: (v) => `site:${v} (filetype:pdf OR filetype:xlsx OR filetype:docx)` },
  { label: 'API keys / secrets', build: (v) => `site:${v} (intext:"api_key" OR intext:"secret" OR intext:"password")` },
  { label: 'Open S3 buckets', build: (v) => `site:s3.amazonaws.com ${v}` },
  { label: 'Pastebin mentions', build: (v) => `site:pastebin.com ${v}` }
]
