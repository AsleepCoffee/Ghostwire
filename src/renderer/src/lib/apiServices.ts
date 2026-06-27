import type { PivotSubject } from './pivot'

/** OSINT services that sit behind an API key. Keys are stored locally in
 *  settings.apiKeys keyed by `id`. Services are split into free-tier and paid. */
export interface ApiService {
  id: string
  name: string
  description: string
  /** Free-tier note, or the paid note for paid services. */
  free: string
  tier: 'free' | 'paid'
  signup: string
  /** What having this key unlocks in GhostWire. */
  unlocks: string
  /** Optional always-visible hint shown under the key input (e.g. which of
   *  several credential values to paste). */
  hint?: string
  /** Optional launch URL for the "API Integrations" tools (unlocked by the key).
   *  {QUERY} is replaced by the search term. */
  tool?: { url: string; query: boolean; category: string }
}

export const API_SERVICES: ApiService[] = [
  // ---------------- Free tier ----------------
  {
    id: 'virustotal',
    name: 'VirusTotal',
    description: 'File / URL / domain / IP reputation and relations.',
    free: 'Free public API key (4 req/min, 500/day).',
    tier: 'free',
    signup: 'https://www.virustotal.com/gui/join-us',
    unlocks: 'Domain/IP/file reputation lookups.',
    tool: { url: 'https://www.virustotal.com/gui/search/{QUERY}', query: true, category: 'Infrastructure' }
  },
  {
    id: 'shodan',
    name: 'Shodan',
    description: 'Internet-connected host & service intelligence.',
    free: 'Free API key with limited monthly credits.',
    tier: 'free',
    signup: 'https://account.shodan.io/register',
    unlocks: 'Host/service search.',
    tool: { url: 'https://www.shodan.io/search?query={QUERY}', query: true, category: 'Infrastructure' }
  },
  {
    id: 'abuseipdb',
    name: 'AbuseIPDB',
    description: 'IP abuse / reputation checks.',
    free: 'Free plan: 1,000 checks/day.',
    tier: 'free',
    signup: 'https://www.abuseipdb.com/register',
    unlocks: 'IP abuse reports.',
    tool: { url: 'https://www.abuseipdb.com/check/{QUERY}', query: true, category: 'Infrastructure' }
  },
  {
    id: 'urlscan',
    name: 'urlscan.io',
    description: 'Scan and inspect websites; search historical scans.',
    free: 'Free API key (rate-limited).',
    tier: 'free',
    signup: 'https://urlscan.io/user/signup',
    unlocks: 'Site scans & historical search.',
    tool: { url: 'https://urlscan.io/search/#{QUERY}', query: true, category: 'Infrastructure' }
  },
  {
    id: 'ipinfo',
    name: 'IPinfo',
    description: 'IP geolocation, ASN, company, hosting data.',
    free: 'Free token: 50,000 lookups/month.',
    tier: 'free',
    signup: 'https://ipinfo.io/signup',
    unlocks: 'IP enrichment (graph transform).',
    tool: { url: 'https://ipinfo.io/{QUERY}', query: true, category: 'Infrastructure' }
  },
  {
    id: 'wigle',
    name: 'WiGLE',
    description: 'Geolocate WiFi networks by SSID or BSSID (wardriving database).',
    free: 'Free account; paste the "Encoded for use" token (or API Name:Token). Daily query limit.',
    tier: 'free',
    signup: 'https://wigle.net/account',
    unlocks: 'Wireless (WiGLE) network search & mapping.',
    hint: 'On wigle.net → Account, paste the long "Encoded for use" value (NOT the API Name or API Token on their own). "API Name:API Token" with the colon also works.'
  },
  {
    id: 'emailhippo',
    name: 'Email Hippo',
    description: 'Verify whether an email address actually exists (mailbox check).',
    free: 'Free API key with a monthly verification allowance.',
    tier: 'free',
    signup: 'https://www.emailhippo.com/en-us/email-verification-api',
    unlocks: 'Email deliverability checks in Email & Phone Intelligence.'
  },
  {
    id: 'hunter',
    name: 'Hunter.io',
    description: 'Find & verify professional email addresses.',
    free: 'Free plan: 25 searches + 50 verifications/month.',
    tier: 'free',
    signup: 'https://hunter.io/users/sign_up',
    unlocks: 'Corporate email discovery.',
    tool: { url: 'https://hunter.io/search/{QUERY}', query: true, category: 'Email & Breach' }
  },
  {
    id: 'pulsedive',
    name: 'Pulsedive',
    description: 'Threat intel on domains, IPs, URLs.',
    free: 'Free API key.',
    tier: 'free',
    signup: 'https://pulsedive.com/register',
    unlocks: 'Indicator threat intel.',
    tool: { url: 'https://pulsedive.com/indicator/?ioc={QUERY}', query: true, category: 'Infrastructure' }
  },
  {
    id: 'censys',
    name: 'Censys',
    description: 'Host & cert search — Platform token, or legacy API ID:Secret',
    free: 'Free tier. Paste a Platform token, or legacy "API ID:Secret".',
    tier: 'free',
    signup: 'https://censys.io/register',
    unlocks: 'Host & certificate search.',
    tool: { url: 'https://search.censys.io/search?resource=hosts&q={QUERY}', query: true, category: 'Infrastructure' }
  },
  {
    id: 'numverify',
    name: 'numverify',
    description: 'Phone number validation, carrier & line type.',
    free: 'Free plan: 100 requests/month.',
    tier: 'free',
    signup: 'https://numverify.com/product',
    unlocks: 'Phone validation (API).'
  },
  {
    id: 'opencage',
    name: 'OpenCage',
    description: 'Forward / reverse geocoding.',
    free: 'Free trial: 2,500 requests/day.',
    tier: 'free',
    signup: 'https://opencagedata.com/users/sign_up',
    unlocks: 'Geocoding (API).'
  },
  {
    id: 'openai',
    name: 'OpenAI (vision)',
    description: 'Vision model for AI image geolocation ("best guess" from what the photo shows).',
    free: 'Paid, usage-based. A few cents per image.',
    tier: 'paid',
    signup: 'https://platform.openai.com/api-keys',
    unlocks: 'AI geolocation on the Evidence Board (Geolocate → AI best guess).'
  },

  // ---------------- Paid ----------------
  {
    id: 'securitytrails',
    name: 'SecurityTrails',
    description: 'DNS history, subdomains, WHOIS.',
    free: 'Paid API — no free tier.',
    tier: 'paid',
    signup: 'https://securitytrails.com/corp/api',
    unlocks: 'DNS history & subdomain search.',
    tool: { url: 'https://securitytrails.com/list/apex_domain/{QUERY}', query: true, category: 'Domain' }
  },
  {
    id: 'dehashed',
    name: 'DeHashed',
    description: 'Credential / breach data search.',
    free: 'Paid API & search (subscription).',
    tier: 'paid',
    signup: 'https://www.dehashed.com/register',
    unlocks: 'Breach credential search.',
    tool: { url: 'https://dehashed.com/search?query={QUERY}', query: true, category: 'Email & Breach' }
  },
  {
    id: 'intelx',
    name: 'Intelligence X',
    description: 'Search engine & data archive (leaks, darkweb, docs).',
    free: 'Limited free; full API is paid.',
    tier: 'paid',
    signup: 'https://intelx.io/account?tab=developer',
    unlocks: 'Leak / archive search.',
    tool: { url: 'https://intelx.io/?s={QUERY}', query: true, category: 'Email & Breach' }
  },
  {
    id: 'greynoise',
    name: 'GreyNoise',
    description: 'Tells you if an IP is internet background noise / scanner.',
    free: 'Paid API (Community tier discontinued).',
    tier: 'paid',
    signup: 'https://www.greynoise.io/plans',
    unlocks: 'IP noise / scanner classification.',
    tool: { url: 'https://viz.greynoise.io/ip/{QUERY}', query: true, category: 'Infrastructure' }
  },
  {
    id: 'hibp',
    name: 'Have I Been Pwned',
    description: 'Which breaches an email address appears in.',
    free: 'Paid API key ($3.95/mo) for breach lookups.',
    tier: 'paid',
    signup: 'https://haveibeenpwned.com/API/Key',
    unlocks: 'Breach lookups in Email & Phone Intelligence.'
  }
]

export const FREE_SERVICES = API_SERVICES.filter((s) => s.tier === 'free')
export const PAID_SERVICES = API_SERVICES.filter((s) => s.tier === 'paid')
export const INTEGRATION_SERVICES = API_SERVICES.filter((s) => s.tool)

/** Deep-link templates per service per pivot subject ({V} = the value).
 *  These are the result pages each provider shows for that data type. */
const INTEGRATION_TARGETS: Record<string, Partial<Record<PivotSubject, string>>> = {
  virustotal: {
    domain: 'https://www.virustotal.com/gui/domain/{V}',
    ip: 'https://www.virustotal.com/gui/ip-address/{V}',
    email: 'https://www.virustotal.com/gui/search/{V}',
    username: 'https://www.virustotal.com/gui/search/{V}'
  },
  shodan: {
    ip: 'https://www.shodan.io/host/{V}',
    domain: 'https://www.shodan.io/search?query=hostname:{V}'
  },
  abuseipdb: { ip: 'https://www.abuseipdb.com/check/{V}' },
  urlscan: {
    domain: 'https://urlscan.io/domain/{V}',
    ip: 'https://urlscan.io/search/#ip:%22{V}%22'
  },
  ipinfo: { ip: 'https://ipinfo.io/{V}' },
  hunter: {
    domain: 'https://hunter.io/search/{V}',
    email: 'https://hunter.io/verify/{V}'
  },
  pulsedive: {
    domain: 'https://pulsedive.com/indicator/?ioc={V}',
    ip: 'https://pulsedive.com/indicator/?ioc={V}'
  },
  censys: {
    ip: 'https://search.censys.io/hosts/{V}',
    domain: 'https://search.censys.io/search?resource=hosts&q={V}'
  },
  securitytrails: { domain: 'https://securitytrails.com/domain/{V}/dns' },
  greynoise: { ip: 'https://viz.greynoise.io/ip/{V}' },
  dehashed: {
    email: 'https://dehashed.com/search?query={V}',
    username: 'https://dehashed.com/search?query={V}',
    name: 'https://dehashed.com/search?query={V}',
    phone: 'https://dehashed.com/search?query={V}'
  },
  intelx: {
    email: 'https://intelx.io/?s={V}',
    domain: 'https://intelx.io/?s={V}',
    username: 'https://intelx.io/?s={V}',
    phone: 'https://intelx.io/?s={V}',
    name: 'https://intelx.io/?s={V}'
  }
}

/** Build pivot queries for services the user has a key for, relevant to `subject`. */
export function integrationQueriesFor(
  subject: PivotSubject,
  value: string,
  apiKeys: Record<string, string>
): { label: string; url: string; group: string }[] {
  const v = encodeURIComponent(value.trim())
  const out: { label: string; url: string; group: string }[] = []
  for (const s of API_SERVICES) {
    if (!apiKeys[s.id]) continue
    const tmpl = INTEGRATION_TARGETS[s.id]?.[subject]
    if (!tmpl) continue
    out.push({ group: 'Your API tools', label: s.name, url: tmpl.replace('{V}', v) })
  }
  return out
}
