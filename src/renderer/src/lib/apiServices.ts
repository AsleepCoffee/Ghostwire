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
  }
]

export const FREE_SERVICES = API_SERVICES.filter((s) => s.tier === 'free')
export const PAID_SERVICES = API_SERVICES.filter((s) => s.tier === 'paid')
export const INTEGRATION_SERVICES = API_SERVICES.filter((s) => s.tool)
