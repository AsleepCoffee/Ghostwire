import { randomUUID } from 'crypto'
import type { MailMessage, MailMessageFull, PersonaMailbox } from '../shared/types'

// mail.tm and mail.gw are run by the same provider with an identical API but
// different domain pools — trying both makes provisioning far more reliable.
const PROVIDERS = ['https://api.mail.tm', 'https://api.mail.gw']
const UA = { 'User-Agent': 'GhostWire-OSINT', Accept: 'application/json' }

async function jsonOrThrow(res: Response): Promise<unknown> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function randomPart(): string {
  return `gw${randomUUID().replace(/-/g, '').slice(0, 12)}`
}
function randomPassword(): string {
  return randomUUID().replace(/-/g, '').slice(0, 18)
}

/** Try to create an account on one provider base. Returns mailbox or null if the
 *  provider has no usable domains right now. Throws only on hard errors. */
async function tryProvider(base: string, localPart?: string): Promise<PersonaMailbox | null> {
  let domainsData: { 'hydra:member'?: { domain?: string; isActive?: boolean }[] }
  try {
    domainsData = (await jsonOrThrow(await fetch(`${base}/domains?page=1`, { headers: UA }))) as typeof domainsData
  } catch {
    return null // provider unreachable / rate-limited — let the caller try the next one
  }
  const members = (domainsData['hydra:member'] ?? []).filter((d) => d.domain)
  const active = members.filter((d) => d.isActive !== false).map((d) => d.domain as string)
  const pool = active.length ? active : members.map((d) => d.domain as string)
  if (pool.length === 0) return null

  const password = randomPassword()
  const locals = [
    ...(localPart ? [localPart.toLowerCase().replace(/[^a-z0-9._-]/g, '')] : []),
    randomPart(),
    randomPart()
  ].filter(Boolean)

  let address = ''
  outer: for (const domain of pool) {
    for (const part of locals) {
      const candidate = `${part}@${domain}`
      const res = await fetch(`${base}/accounts`, {
        method: 'POST',
        headers: { ...UA, 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: candidate, password })
      })
      if (res.ok) {
        address = candidate
        break outer
      }
      if (res.status === 422) continue
      return null // unexpected — try next provider
    }
  }
  if (!address) return null

  const tokenData = (await jsonOrThrow(
    await fetch(`${base}/token`, {
      method: 'POST',
      headers: { ...UA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    })
  )) as { token?: string }
  if (!tokenData.token) return null

  return { provider: 'mailtm', address, password, token: tokenData.token, base, createdAt: Date.now() }
}

/** Provision a disposable mailbox, trying mail.tm then mail.gw. */
export async function createMailbox(localPart?: string): Promise<PersonaMailbox> {
  for (const base of PROVIDERS) {
    const mb = await tryProvider(base, localPart)
    if (mb) return mb
  }
  throw new Error(
    'Disposable mail services (mail.tm / mail.gw) have no domains available right now — try again shortly, or set a catch-all domain in Settings for a durable address.'
  )
}

export async function listMessages(token: string, base = PROVIDERS[0]): Promise<MailMessage[]> {
  const data = (await jsonOrThrow(
    await fetch(`${base}/messages?page=1`, { headers: { ...UA, Authorization: `Bearer ${token}` } })
  )) as { 'hydra:member'?: Record<string, unknown>[] }
  return (data['hydra:member'] ?? []).map((m) => ({
    id: String(m.id),
    from: String((m.from as { address?: string })?.address ?? ''),
    subject: String(m.subject ?? '(no subject)'),
    intro: String(m.intro ?? ''),
    seen: Boolean(m.seen),
    date: String(m.createdAt ?? '')
  }))
}

export async function getMessage(token: string, id: string, base = PROVIDERS[0]): Promise<MailMessageFull> {
  const m = (await jsonOrThrow(
    await fetch(`${base}/messages/${encodeURIComponent(id)}`, {
      headers: { ...UA, Authorization: `Bearer ${token}` }
    })
  )) as Record<string, unknown>
  return {
    id: String(m.id),
    from: String((m.from as { address?: string })?.address ?? ''),
    subject: String(m.subject ?? '(no subject)'),
    intro: String(m.intro ?? ''),
    seen: Boolean(m.seen),
    date: String(m.createdAt ?? ''),
    text: String(m.text ?? ''),
    html: Array.isArray(m.html) ? (m.html as string[]) : []
  }
}
