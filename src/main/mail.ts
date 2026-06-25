import { randomUUID } from 'crypto'
import type { MailMessage, MailMessageFull, PersonaMailbox } from '../shared/types'

const BASE = 'https://api.mail.tm'
const UA = { 'User-Agent': 'GhostWire-OSINT', Accept: 'application/json' }

async function jsonOrThrow(res: Response): Promise<unknown> {
  if (!res.ok) throw new Error(`mail.tm HTTP ${res.status}`)
  return res.json()
}

function randomPart(): string {
  return `gw${randomUUID().replace(/-/g, '').slice(0, 12)}`
}
function randomPassword(): string {
  return randomUUID().replace(/-/g, '').slice(0, 18)
}

/** Provision a fresh mail.tm mailbox; returns address/password/token. */
export async function createMailbox(localPart?: string): Promise<PersonaMailbox> {
  const domainsData = (await jsonOrThrow(await fetch(`${BASE}/domains?page=1`, { headers: UA }))) as {
    'hydra:member'?: { domain?: string; isActive?: boolean }[]
  }
  const members = (domainsData['hydra:member'] ?? []).filter((d) => d.domain)
  // Prefer active domains, but fall back to whatever is returned (the active flag is flaky).
  const active = members.filter((d) => d.isActive !== false).map((d) => d.domain as string)
  const pool = active.length ? active : members.map((d) => d.domain as string)
  if (pool.length === 0) {
    throw new Error('mail.tm has no public domains right now — try again shortly, or use a catch-all domain (Settings).')
  }

  const password = randomPassword()
  const localCandidates = [
    ...(localPart ? [localPart.toLowerCase().replace(/[^a-z0-9._-]/g, '')] : []),
    randomPart(),
    randomPart()
  ].filter(Boolean)

  // Try each domain × local-part until one is accepted.
  let address = ''
  outer: for (const domain of pool) {
    for (const part of localCandidates) {
      const candidate = `${part}@${domain}`
      const res = await fetch(`${BASE}/accounts`, {
        method: 'POST',
        headers: { ...UA, 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: candidate, password })
      })
      if (res.ok) {
        address = candidate
        break outer
      }
      if (res.status === 422) continue // taken/invalid — try next
      throw new Error(`mail.tm account error HTTP ${res.status}`)
    }
  }
  if (!address) throw new Error('Could not create a mail.tm address — try again or use a catch-all domain.')

  const tokenData = (await jsonOrThrow(
    await fetch(`${BASE}/token`, {
      method: 'POST',
      headers: { ...UA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    })
  )) as { token?: string }
  if (!tokenData.token) throw new Error('mail.tm did not return a token')

  return { provider: 'mailtm', address, password, token: tokenData.token, createdAt: Date.now() }
}

export async function listMessages(token: string): Promise<MailMessage[]> {
  const data = (await jsonOrThrow(
    await fetch(`${BASE}/messages?page=1`, { headers: { ...UA, Authorization: `Bearer ${token}` } })
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

export async function getMessage(token: string, id: string): Promise<MailMessageFull> {
  const m = (await jsonOrThrow(
    await fetch(`${BASE}/messages/${encodeURIComponent(id)}`, {
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
