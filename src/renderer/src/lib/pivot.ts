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

/** Web search engines for the dork builder and multi-engine pivots. */
export const SEARCH_ENGINES: { label: string; url: (q: string) => string }[] = [
  { label: 'Google', url: (q) => `https://www.google.com/search?q=${enc(q)}` },
  { label: 'Bing', url: (q) => `https://www.bing.com/search?q=${enc(q)}` },
  { label: 'DuckDuckGo', url: (q) => `https://duckduckgo.com/?q=${enc(q)}` },
  { label: 'Yandex', url: (q) => `https://yandex.com/search/?text=${enc(q)}` },
  { label: 'Brave', url: (q) => `https://search.brave.com/search?q=${enc(q)}` },
  { label: 'Startpage', url: (q) => `https://www.startpage.com/sp/search?query=${enc(q)}` },
  { label: 'Mojeek', url: (q) => `https://www.mojeek.com/search?q=${enc(q)}` },
  { label: 'Baidu', url: (q) => `https://www.baidu.com/s?wd=${enc(q)}` },
  { label: 'Yahoo', url: (q) => `https://search.yahoo.com/search?p=${enc(q)}` }
]

/** The same query across every non-Google engine (Google is already covered per-subject). */
function engineQueries(query: string): PivotQuery[] {
  return SEARCH_ENGINES.filter((e) => e.label !== 'Google').map((e) => ({
    group: 'Other search engines',
    label: e.label,
    url: e.url(query)
  }))
}

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
export const USERNAME_SITES: { label: string; url: (u: string) => string }[] = [
  { label: 'X / Twitter', url: (u) => `https://x.com/${u}` },
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
      out.push({ group: 'Search', label: 'NameChk', url: 'https://namechk.com/' })
      out.push({ group: 'Search', label: 'NameCheckup', url: 'https://namecheckup.com/' })
      out.push({ group: 'Search', label: 'Google — accounts', url: g(`${exact} (profile OR account OR "@${u}")`) })
      // View / search a handle on X without an account (Nitter front-ends + dorks).
      out.push({ group: 'Twitter / X (no login)', label: 'Nitter — profile', url: `https://xcancel.com/${u}` })
      out.push({ group: 'Twitter / X (no login)', label: 'Nitter — their tweets', url: `https://xcancel.com/search?q=${enc(`from:${u}`)}&f=tweets` })
      out.push({ group: 'Twitter / X (no login)', label: 'Sotwe', url: `https://www.sotwe.com/${u}` })
      out.push({ group: 'Twitter / X (no login)', label: 'Google — on X', url: g(`(site:x.com OR site:twitter.com) ("@${u}" OR "${u}")`) })
      // View an Instagram profile without an account (Imginn front-end + dork).
      out.push({ group: 'Instagram (no login)', label: 'Imginn', url: `https://imginn.com/${u}/` })
      out.push({ group: 'Instagram (no login)', label: 'Google — on Instagram', url: g(`site:instagram.com "${u}"`) })
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
      out.push({ group: 'Social', label: 'SowSearch (FB graph search)', url: 'https://sowsearch.info/' })
      out.push({ group: 'Social', label: 'IntelX — Facebook tools', url: 'https://intelx.io/tools?tab=facebook' })
      out.push({ group: 'Search', label: 'Google — profiles', url: g(`${exact} (profile OR bio OR about)`) })
      out.push({ group: 'Search', label: 'Google — docs', url: g(`${exact} (filetype:pdf OR filetype:doc OR filetype:pptx)`) })
      out.push({ group: 'Search', label: 'Google — contact', url: g(`${exact} (email OR contact OR phone)`) })
      // People-search engines (US-centric). Most take a name in the path/query;
      // an imperfect match just lands on the site's own search.
      {
        const parts = v.split(/\s+/).filter(Boolean)
        const Hy = parts.join('-') // John-Smith
        const hy = Hy.toLowerCase() // john-smith
        const first = (parts[0] ?? '').toLowerCase()
        const last = (parts.length > 1 ? parts[parts.length - 1] : '').toLowerCase()
        const P = (label: string, url: string): void => {
          out.push({ group: 'People search', label, url })
        }
        P('TruePeopleSearch', `https://www.truepeoplesearch.com/results?name=${enc(v)}`)
        P('FastPeopleSearch', `https://www.fastpeoplesearch.com/name/${hy}`)
        P('FastBackgroundCheck', `https://www.fastbackgroundcheck.com/people/${hy}`)
        P('WhitePages', `https://www.whitepages.com/name/${Hy}`)
        P('411', `https://www.411.com/name/${Hy}`)
        P('Spokeo', `https://www.spokeo.com/${Hy}`)
        P("That'sThem", `https://thatsthem.com/name/${Hy}`)
        P('WebMii', `https://webmii.com/people?n=${enc(v)}`)
        P('PeekYou', last ? `https://www.peekyou.com/${first}_${last}` : 'https://www.peekyou.com/')
        P('Radaris', last ? `https://radaris.com/p/${parts[0]}/${parts[parts.length - 1]}/` : `https://radaris.com/search?ff=${enc(v)}`)
        P('Nuwber', `https://nuwber.com/search?name=${enc(v)}`)
        P('ZabaSearch', `https://www.zabasearch.com/people/${hy}/`)
        P('AdvancedBackgroundChecks', `https://www.advancedbackgroundchecks.com/${hy}`)
        P('Pipl', `https://pipl.com/search/?q=${enc(v)}`)
        // Public / voter records. VoterRecords is Cloudflare-protected and often
        // blocks VPN/datacenter exits — the Google dork is a reliable fallback.
        const R = (label: string, url: string): void => {
          out.push({ group: 'Public records', label, url })
        }
        R('VoterRecords', `https://www.voterrecords.com/voters/${hy}/`)
        R('Google — voter records', g(`${exact} (voter OR "voter registration" OR "date of birth")`))
        R('VoteShield / state lookup', g(`${exact} voter registration lookup`))
        R('BlockShopper (property)', `https://blockshopper.com/search?q=${enc(v)}`)
        R('County records (dork)', g(`${exact} ("county clerk" OR "public records" OR site:*.gov)`))
      }
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
      const d = v.replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
      // Whois / DNS
      out.push({ group: 'Whois & DNS', label: 'Domain Dossier', url: `https://centralops.net/co/DomainDossier.aspx?addr=${enc(d)}&dom_whois=true&dom_dns=true&net_whois=true` })
      out.push({ group: 'Whois & DNS', label: 'ViewDNS — whois', url: `https://viewdns.info/whois/?domain=${enc(d)}` })
      out.push({ group: 'Whois & DNS', label: 'ViewDNS — DNS records', url: `https://viewdns.info/dnsrecord/?domain=${enc(d)}` })
      out.push({ group: 'Whois & DNS', label: 'ViewDNS — IP history', url: `https://viewdns.info/iphistory/?domain=${enc(d)}` })
      out.push({ group: 'Whois & DNS', label: 'DNSlytics', url: `https://dnslytics.com/domain/${enc(d)}` })
      out.push({ group: 'Whois & DNS', label: 'DNSdumpster', url: 'https://dnsdumpster.com/' })
      out.push({ group: 'Whois & DNS', label: 'crt.sh (subdomains)', url: `https://crt.sh/?q=${enc(d)}` })
      // Tech stack & infrastructure
      out.push({ group: 'Tech & infra', label: 'BuiltWith', url: `https://builtwith.com/${enc(d)}` })
      out.push({ group: 'Tech & infra', label: 'Shodan', url: `https://www.shodan.io/search?query=${enc(d)}` })
      out.push({ group: 'Tech & infra', label: 'urlscan.io', url: `https://urlscan.io/domain/${enc(d)}` })
      out.push({ group: 'Tech & infra', label: 'VirusTotal', url: `https://www.virustotal.com/gui/domain/${enc(d)}` })
      out.push({ group: 'Tech & infra', label: 'Web Check', url: `https://web-check.as93.net/check/${enc(d)}` })
      out.push({ group: 'Tech & infra', label: 'Wayback Machine', url: `https://web.archive.org/web/*/${enc(d)}` })
      // Relationships / reputation / monitoring
      out.push({ group: 'Relationships', label: 'SpyOnWeb (shared analytics)', url: `https://spyonweb.com/${enc(d)}` })
      out.push({ group: 'Relationships', label: 'BacklinkWatch', url: 'http://backlinkwatch.com/index.php' })
      out.push({ group: 'Relationships', label: 'VisualPing (monitor changes)', url: `https://visualping.io/?url=${enc('https://' + d)}` })
      // Search
      out.push({ group: 'Search', label: `Google site:${d}`, url: g(`site:${d}`) })
      out.push({ group: 'Search', label: 'Google — exposed', url: g(`site:${d} (intitle:index.of OR ext:env OR ext:sql OR ext:log)`) })
      break
    }
    case 'ip': {
      out.push({ group: 'Recon', label: 'Shodan', url: `https://www.shodan.io/host/${enc(v)}` })
      out.push({ group: 'Recon', label: 'Censys', url: `https://search.censys.io/hosts/${enc(v)}` })
      out.push({ group: 'Recon', label: 'VirusTotal', url: `https://www.virustotal.com/gui/ip-address/${enc(v)}` })
      out.push({ group: 'Recon', label: 'AbuseIPDB', url: `https://www.abuseipdb.com/check/${enc(v)}` })
      out.push({ group: 'Recon', label: 'DNSlytics reverse IP', url: `https://dnslytics.com/reverse-ip/${enc(v)}` })
      out.push({ group: 'Recon', label: 'ViewDNS reverse IP', url: `https://viewdns.info/reverseip/?host=${enc(v)}` })
      out.push({ group: 'Recon', label: 'SpyOnWeb', url: `https://spyonweb.com/${enc(v)}` })
      out.push({ group: 'Recon', label: 'urlscan.io', url: `https://urlscan.io/search/#ip:${enc(v)}` })
      break
    }
    case 'organization': {
      out.push({ group: 'Search', label: `Google "${v}"`, url: g(exact) })
      out.push({ group: 'Search', label: 'LinkedIn company', url: g(`${exact} site:linkedin.com/company`) })
      out.push({ group: 'Search', label: 'Employees', url: g(`${exact} (site:linkedin.com/in)`) })
      out.push({ group: 'Search', label: 'Docs', url: g(`${exact} (filetype:pdf OR filetype:xlsx)`) })
      out.push({ group: 'Business records', label: 'OpenCorporates', url: `https://opencorporates.com/companies?q=${enc(v)}` })
      out.push({ group: 'Business records', label: 'AiHitData', url: `https://www.aihitdata.com/search?q=${enc(v)}` })
      out.push({ group: 'Business records', label: 'Crunchbase', url: g(`${exact} site:crunchbase.com`) })
      out.push({ group: 'Business records', label: 'SEC EDGAR', url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${enc(v)}&type=&dateb=&owner=include&count=40` })
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
    }
  }
  // Multi-engine web search for everything except image reverse-search.
  if (subject !== 'image') {
    const term = subject === 'name' || subject === 'organization' ? exact : v
    out.push(...engineQueries(term))
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
