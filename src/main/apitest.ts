// Lightweight "is this API key valid?" probes for the services in apiServices.ts.
// Each makes one cheap authenticated request; 2xx (or 429 rate-limit) means the key works.

type Build = (key: string) => { url: string; headers?: Record<string, string> }

const enc = encodeURIComponent

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
  greynoise: (k) => ({ url: 'https://api.greynoise.io/v3/community/8.8.8.8', headers: { key: k, Accept: 'application/json' } }),
  pulsedive: (k) => ({ url: `https://pulsedive.com/api/info.php?indicator=google.com&pretty=1&key=${enc(k)}` }),
  opencage: (k) => ({ url: `https://api.opencagedata.com/geocode/v1/json?q=berlin&key=${enc(k)}&limit=1` }),
  urlscan: (k) => ({ url: 'https://urlscan.io/user/quota/', headers: { 'API-Key': k, Accept: 'application/json' } })
}

export async function testApiKey(id: string, key: string): Promise<{ ok: boolean; message: string }> {
  if (!key || !key.trim()) return { ok: false, message: 'No key entered' }
  const build = TESTS[id]
  if (!build) return { ok: false, message: 'No automatic test for this service' }
  const { url, headers } = build(key.trim())
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'GhostWire-OSINT', ...(headers ?? {}) } })
    if (res.ok) return { ok: true, message: 'Key valid ✓' }
    if (res.status === 429) return { ok: true, message: 'Valid (rate-limited)' }
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'Invalid / unauthorized key' }
    return { ok: false, message: `Failed (HTTP ${res.status})` }
  } catch {
    return { ok: false, message: 'Network error — check connection' }
  }
}
