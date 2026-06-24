/** OSINT services that expose a usable free tier behind an API key.
 *  Keys are stored locally in settings.apiKeys keyed by `id`. */
export interface ApiService {
  id: string
  name: string
  description: string
  free: string
  signup: string
}

export const API_SERVICES: ApiService[] = [
  {
    id: 'virustotal',
    name: 'VirusTotal',
    description: 'File / URL / domain / IP reputation and relations.',
    free: 'Free public API key (4 req/min, 500/day).',
    signup: 'https://www.virustotal.com/gui/join-us'
  },
  {
    id: 'shodan',
    name: 'Shodan',
    description: 'Internet-connected host & service intelligence.',
    free: 'Free API key with limited monthly credits.',
    signup: 'https://account.shodan.io/register'
  },
  {
    id: 'abuseipdb',
    name: 'AbuseIPDB',
    description: 'IP abuse / reputation checks.',
    free: 'Free plan: 1,000 checks/day.',
    signup: 'https://www.abuseipdb.com/register'
  },
  {
    id: 'urlscan',
    name: 'urlscan.io',
    description: 'Scan and inspect websites; search historical scans.',
    free: 'Free API key (rate-limited).',
    signup: 'https://urlscan.io/user/signup'
  },
  {
    id: 'ipinfo',
    name: 'IPinfo',
    description: 'IP geolocation, ASN, company, hosting data.',
    free: 'Free token: 50,000 lookups/month.',
    signup: 'https://ipinfo.io/signup'
  },
  {
    id: 'hunter',
    name: 'Hunter.io',
    description: 'Find & verify professional email addresses.',
    free: 'Free plan: 25 searches + 50 verifications/month.',
    signup: 'https://hunter.io/users/sign_up'
  },
  {
    id: 'securitytrails',
    name: 'SecurityTrails',
    description: 'DNS history, subdomains, WHOIS.',
    free: 'Paid API (no free tier) — add a key only if you have one.',
    signup: 'https://securitytrails.com/app/signup'
  },
  {
    id: 'greynoise',
    name: 'GreyNoise',
    description: 'Tells you if an IP is internet background noise / scanner.',
    free: 'Free Community API.',
    signup: 'https://viz.greynoise.io/signup'
  },
  {
    id: 'pulsedive',
    name: 'Pulsedive',
    description: 'Threat intel on domains, IPs, URLs.',
    free: 'Free API key.',
    signup: 'https://pulsedive.com/register'
  },
  {
    id: 'numverify',
    name: 'numverify',
    description: 'Phone number validation, carrier & line type.',
    free: 'Free plan: 100 requests/month.',
    signup: 'https://numverify.com/product'
  },
  {
    id: 'opencage',
    name: 'OpenCage',
    description: 'Forward / reverse geocoding.',
    free: 'Free trial: 2,500 requests/day.',
    signup: 'https://opencagedata.com/users/sign_up'
  },
  {
    id: 'censys',
    name: 'Censys',
    description: 'Host & certificate search (API ID:secret).',
    free: 'Free tier with monthly query allowance.',
    signup: 'https://censys.io/register'
  }
]
