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
  openai: (k) => ({ url: 'https://api.openai.com/v1/models', headers: { Authorization: `Bearer ${k}` } }),
  hunter: (k) => ({ url: `https://api.hunter.io/v2/account?api_key=${enc(k)}` }),
  securitytrails: (k) => ({ url: 'https://api.securitytrails.com/v1/ping', headers: { APIKEY: k, Accept: 'application/json' } }),
  pulsedive: (k) => ({ url: `https://pulsedive.com/api/info.php?indicator=google.com&pretty=1&key=${enc(k)}` }),
  opencage: (k) => ({ url: `https://api.opencagedata.com/geocode/v1/json?q=berlin&key=${enc(k)}&limit=1` }),
  // urlscan: the core search endpoint validates a supplied API-Key header.
  urlscan: (k) => ({
    url: 'https://urlscan.io/api/v1/search/?q=domain:urlscan.io&size=1',
    headers: { 'API-Key': k, Accept: 'application/json' }
  }),
  // Censys: "API ID:Secret" → legacy Search (Basic auth); a single token → Platform (Bearer).
  censys: (k) =>
    k.includes(':')
      ? {
          url: 'https://search.censys.io/api/v1/account',
          headers: { Authorization: `Basic ${Buffer.from(k).toString('base64')}`, Accept: 'application/json' }
        }
      : {
          // Censys Platform token (Bearer). Host-asset lookup validates the token.
          url: 'https://api.platform.censys.io/v3/global/asset/host/8.8.8.8',
          headers: { Authorization: `Bearer ${k}`, Accept: 'application/json' }
        }
}

/** Strip whitespace, surrounding quotes, and zero-width chars often added by copy/paste. */
function cleanKey(s: string): string {
  return s
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[​-‍﻿]/g, '')
    .trim()
}

export async function testApiKey(id: string, key: string): Promise<KeyTestResult> {
  const k = cleanKey(key ?? '')
  if (!k) return { ok: false, status: 'invalid', message: 'No key entered' }

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
