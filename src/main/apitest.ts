// Lightweight "is this API key valid?" probes for the services in apiServices.ts.
// Each makes one cheap authenticated request and classifies the result.

type Build = (key: string) => { url: string; headers?: Record<string, string> }

export type KeyStatus = 'valid' | 'invalid' | 'error' | 'untestable'
export interface KeyTestResult {
  ok: boolean
  status: KeyStatus
  message: string
}

const enc = encodeURIComponent

// Only services with a reliable, documented validation endpoint are listed here.
// Others (greynoise community / dehashed / intelx / numverify) can't be validated
// with a single cheap GET, so they report "untestable" rather than a false error.
const TESTS: Record<string, Build> = {
  virustotal: (k) => ({ url: 'https://www.virustotal.com/api/v3/domains/google.com', headers: { 'x-apikey': k } }),
  shodan: (k) => ({ url: `https://api.shodan.io/api-info?key=${enc(k)}` }),
  abuseipdb: (k) => ({
    url: 'https://api.abuseipdb.com/api/v2/check?ipAddress=8.8.8.8&maxAgeInDays=90',
    headers: { Key: k, Accept: 'application/json' }
  }),
  ipinfo: (k) => ({ url: `https://ipinfo.io/8.8.8.8/json?token=${enc(k)}` }),
  hunter: (k) => ({ url: `https://api.hunter.io/v2/account?api_key=${enc(k)}` }),
  securitytrails: (k) => ({ url: 'https://api.securitytrails.com/v1/ping', headers: { APIKEY: k, Accept: 'application/json' } }),
  pulsedive: (k) => ({ url: `https://pulsedive.com/api/info.php?indicator=google.com&pretty=1&key=${enc(k)}` }),
  opencage: (k) => ({ url: `https://api.opencagedata.com/geocode/v1/json?q=berlin&key=${enc(k)}&limit=1` }),
  urlscan: (k) => ({ url: 'https://urlscan.io/user/quota/', headers: { 'API-Key': k, Accept: 'application/json' } }),
  // Censys uses Basic auth with "API ID:Secret".
  censys: (k) => ({
    url: 'https://search.censys.io/api/v1/account',
    headers: { Authorization: `Basic ${Buffer.from(k).toString('base64')}`, Accept: 'application/json' }
  })
}

export async function testApiKey(id: string, key: string): Promise<KeyTestResult> {
  const k = (key ?? '').trim()
  if (!k) return { ok: false, status: 'invalid', message: 'No key entered' }

  // Censys uses Basic auth with two values: "API ID:Secret".
  if (id === 'censys' && !k.includes(':')) {
    return { ok: false, status: 'invalid', message: 'Censys needs "API ID:Secret" (two values, colon-separated)' }
  }

  const build = TESTS[id]
  if (!build) return { ok: false, status: 'untestable', message: 'No automatic test — key is saved for use' }

  const { url, headers } = build(k)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'GhostWire-OSINT', ...(headers ?? {}) } })
    if (res.ok) return { ok: true, status: 'valid', message: 'Key valid' }
    if (res.status === 429) return { ok: true, status: 'valid', message: 'Valid (rate-limited)' }
    // 400 (malformed/rejected key), 401/403 (unauthorized) → the provider rejected the key.
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return { ok: false, status: 'invalid', message: `Provider rejected the key (HTTP ${res.status})` }
    }
    return { ok: false, status: 'error', message: `Service error (HTTP ${res.status})` }
  } catch {
    return { ok: false, status: 'error', message: 'Network error — check connection' }
  }
}
