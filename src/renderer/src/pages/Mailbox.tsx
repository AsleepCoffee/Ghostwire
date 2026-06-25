import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ExternalLink, RotateCw, Lock, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'
import { useSettings } from '../lib/settings'
import { Icon } from '../components/ui'

interface WebviewEl extends HTMLElement {
  reload(): void
  getURL(): string
}

/** Derive the webmail login URL from the personal inbox address. */
function webmailFor(email?: string): { label: string; url: string } {
  const d = (email?.split('@')[1] ?? '').toLowerCase()
  if (/gmail|googlemail/.test(d)) return { label: 'Gmail', url: 'https://mail.google.com/mail/u/0/' }
  if (/outlook|hotmail|live|msn/.test(d)) return { label: 'Outlook', url: 'https://outlook.live.com/mail/0/' }
  if (/proton/.test(d)) return { label: 'Proton Mail', url: 'https://mail.proton.me/u/0/inbox' }
  if (/yahoo/.test(d)) return { label: 'Yahoo Mail', url: 'https://mail.yahoo.com/' }
  if (/icloud|me\.com|mac\.com/.test(d)) return { label: 'iCloud Mail', url: 'https://www.icloud.com/mail/' }
  if (/zoho/.test(d)) return { label: 'Zoho Mail', url: 'https://mail.zoho.com/' }
  return { label: 'Webmail', url: 'https://mail.google.com/' }
}

const STEPS: { title: string; body: string; links?: { label: string; url: string }[] }[] = [
  {
    title: 'Get a domain',
    body: 'Register a cheap domain (a few dollars/year). Cloudflare Registrar is at-cost; Namecheap/Porkbun also work.',
    links: [
      { label: 'Cloudflare Registrar', url: 'https://www.cloudflare.com/products/registrar/' },
      { label: 'Namecheap', url: 'https://www.namecheap.com/domains/' }
    ]
  },
  {
    title: 'Add the domain to Cloudflare (free)',
    body: 'Create a free Cloudflare account and add your domain (point its nameservers to Cloudflare if you registered elsewhere).',
    links: [{ label: 'Cloudflare dashboard', url: 'https://dash.cloudflare.com/' }]
  },
  {
    title: 'Enable Email Routing → catch-all',
    body: 'In Cloudflare → Email → Email Routing, enable it, then add a catch-all rule that forwards "*@yourdomain" to your personal inbox (Gmail, Proton, etc.). Verify the destination address.',
    links: [{ label: 'Email Routing guide', url: 'https://developers.cloudflare.com/email-routing/get-started/enable-email-routing/' }]
  },
  {
    title: 'Tell GhostWire',
    body: 'Enter your catch-all domain and personal inbox below (or in Settings → Persona email). Every persona can then use handle@yourdomain, and all of it lands in your inbox.'
  }
]

export function Mailbox(): JSX.Element {
  const { settings, update } = useSettings()
  const nav = useNavigate()
  const ref = useRef<WebviewEl | null>(null)
  const [domainInput, setDomainInput] = useState('')
  const [emailInput, setEmailInput] = useState('')

  useEffect(() => {
    setDomainInput(settings.catchAllDomain ?? '')
    setEmailInput(settings.personalEmail ?? '')
  }, [settings.catchAllDomain, settings.personalEmail])

  const configured = !!settings.catchAllDomain
  const webmail = webmailFor(settings.personalEmail)

  // ---- Not set up: greyed hero + step-by-step guide ----
  if (!configured) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 space-y-6">
          <div className="card p-6 flex items-start gap-4 opacity-90">
            <div className="w-12 h-12 rounded-xl bg-ink-800 border border-ink-700 flex items-center justify-center shrink-0">
              <Lock size={24} className="text-slate-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Personal mailbox — not set up</h1>
              <p className="text-sm text-slate-400 mt-1">
                Set up a catch-all domain so every sock puppet can use a <code className="text-accent">handle@yourdomain</code>{' '}
                alias that forwards to one inbox you control. Then log in to that inbox right here.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {STEPS.map((s, i) => (
              <div key={i} className="card p-4 flex gap-4">
                <div className="w-7 h-7 rounded-full bg-brand/15 text-brand-glow border border-brand/30 flex items-center justify-center text-sm font-semibold shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-100">{s.title}</div>
                  <p className="text-sm text-slate-400 mt-0.5">{s.body}</p>
                  {s.links && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {s.links.map((l) => (
                        <button key={l.url} className="btn-ghost border border-ink-600 text-xs" onClick={() => api.shell.openExternal(l.url)}>
                          <ExternalLink size={12} /> {l.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Finish setup inline */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-100 mb-3">Finish setup</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Catch-all domain</label>
                <input className="input" placeholder="yourdomain.com" value={domainInput} onChange={(e) => setDomainInput(e.target.value.trim().replace(/^@/, ''))} />
              </div>
              <div>
                <label className="label">Personal inbox (forwards here)</label>
                <input className="input" placeholder="you@gmail.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value.trim())} />
              </div>
            </div>
            <button
              className="btn-primary mt-3"
              disabled={!domainInput.trim()}
              onClick={() => update({ catchAllDomain: domainInput.trim(), personalEmail: emailInput.trim() })}
            >
              <CheckCircle2 size={16} /> Save & open mailbox
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---- Set up: embedded webmail ----
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-ink-700 bg-ink-900">
        <Mail size={18} className="text-brand-glow" />
        <div className="text-sm">
          <span className="text-slate-200 font-medium">{webmail.label}</span>
          <span className="text-slate-500">
            {' '}
            — alias mail to <b className="text-slate-300">*@{settings.catchAllDomain}</b>
            {settings.personalEmail ? ` lands in ${settings.personalEmail}` : ''}
          </span>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button className="btn-ghost !px-2" onClick={() => ref.current?.reload()} title="Reload">
            <RotateCw size={16} />
          </button>
          <button className="btn-ghost !px-2" onClick={() => api.shell.openExternal(webmail.url)} title="Open in system browser">
            <ExternalLink size={16} />
          </button>
          <button className="btn-ghost text-xs" onClick={() => nav('/settings')}>
            <Icon name="Settings" size={14} /> Change
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-white">
        {/* Persistent partition so the login sticks across launches. */}
        <webview
          ref={ref as never}
          src={webmail.url}
          partition="persist:gw-mailbox"
          allowpopups="true"
          style={{ width: '100%', height: '100%', display: 'inline-flex' }}
        />
      </div>
    </div>
  )
}
