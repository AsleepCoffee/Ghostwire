import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ExternalLink, RotateCw, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/api'
import { useSettings } from '../lib/settings'
import { Icon } from '../components/ui'

interface WebviewEl extends HTMLElement {
  reload(): void
  getURL(): string
  executeJavaScript(code: string): Promise<unknown>
  addEventListener(type: string, listener: (e: Event) => void): void
  removeEventListener(type: string, listener: (e: Event) => void): void
}

/** Fill an email + password into a webmail login page (only empty fields, so it
 *  cooperates with Google/Microsoft's two-step email-then-password flows). */
function mailFillScript(email: string, password: string): string {
  const data = JSON.stringify({ email, password })
  return `(function(){
    try {
      var D=${data};
      function vis(el){ return el && el.offsetParent !== null && !el.disabled && !el.readOnly; }
      function setVal(el,val){
        if(!vis(el)||!val||el.value) return;
        el.focus();
        var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
        s.call(el,val);
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
      }
      setVal(document.querySelector('input[type="email"], input[autocomplete="username"], input[name="identifier"], input[name="loginfmt"], input[name*="email" i]'), D.email);
      setVal(document.querySelector('input[type="password"], input[autocomplete="current-password"], input[name="passwd"], input[name="Passwd"]'), D.password);
    } catch(e){}
  })();`
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
    title: 'Register a domain',
    body: 'Buy any cheap domain (often a few dollars/year) — this becomes the @part of every persona email (e.g. empire.coffee). Cloudflare Registrar is at-cost; Namecheap and Porkbun are also fine.',
    links: [
      { label: 'Cloudflare Registrar', url: 'https://www.cloudflare.com/products/registrar/' },
      { label: 'Namecheap', url: 'https://www.namecheap.com/domains/' },
      { label: 'Porkbun', url: 'https://porkbun.com/' }
    ]
  },
  {
    title: 'Add the domain to Cloudflare (free)',
    body: 'Create a free Cloudflare account, click "Add a domain", and enter your domain. If you registered it elsewhere, Cloudflare shows two nameservers — set those at your registrar and wait until the domain shows "Active" (minutes to a few hours). If you bought it through Cloudflare it is already active.',
    links: [{ label: 'Cloudflare dashboard', url: 'https://dash.cloudflare.com/' }]
  },
  {
    title: 'Enable Email Routing',
    body: 'In Cloudflare pick your domain → left sidebar → Email → Email Routing → Get started / Enable. Cloudflare automatically adds the required MX and SPF (TXT) DNS records for you. When the page shows Status: Enabled and DNS records: Locked, this part is done.',
    links: [{ label: 'Email Routing — get started', url: 'https://developers.cloudflare.com/email-routing/get-started/enable-email-routing/' }]
  },
  {
    title: 'Create a dedicated receiving account',
    body: 'Make a brand-new free email account just for sock-puppet mail — a throwaway Gmail (e.g. yourcrew.osint@gmail.com) works perfectly. Do NOT use your personal inbox: this account is what GhostWire signs into and shows you in the Mailbox tab, so it should hold nothing but persona mail.',
    links: [{ label: 'Create a Gmail', url: 'https://accounts.google.com/signup' }]
  },
  {
    title: 'Verify it as your Cloudflare destination',
    body: 'Email Routing → "Destination Addresses" tab → "Add destination address" → enter that dedicated account (e.g. yourcrew.osint@gmail.com). Cloudflare emails it a confirmation link — open it and click Verify. The address must show "Verified" before it can receive anything.',
    links: [{ label: 'Destination addresses docs', url: 'https://developers.cloudflare.com/email-routing/setup/email-routing-addresses/' }]
  },
  {
    title: 'Turn on the catch-all rule',
    body: 'Email Routing → "Routing rules" tab → scroll to "Catch-all address" → Edit → set Action to "Send to an email" and choose your verified destination → Save → make sure the catch-all toggle is Enabled. This forwards EVERY address at your domain (*@yourdomain) to your inbox. (You can ignore the "Email Workers / Destination Workers" tab — that is only for custom scripts and is not needed here.)',
    links: [{ label: 'Routing rules docs', url: 'https://developers.cloudflare.com/email-routing/setup/email-routing-rules/' }]
  },
  {
    title: 'Test it',
    body: 'Send an email from any account to something-random@yourdomain. Within a few seconds it should arrive in your dedicated receiving account. If it does, routing works — every address at your domain now lands in that one inbox.'
  },
  {
    title: 'Tell GhostWire',
    body: 'Enter your catch-all domain and the dedicated receiving account below (or in Settings → Persona email). Personas can then use handle@yourdomain, and you read ALL of their mail from this Mailbox tab — GhostWire signs into that account’s webmail right here, so nothing ever touches your personal inbox.'
  }
]

export function Mailbox(): JSX.Element {
  const { settings, update } = useSettings()
  const nav = useNavigate()
  const ref = useRef<WebviewEl | null>(null)
  const [domainInput, setDomainInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [passInput, setPassInput] = useState('')
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    setDomainInput(settings.catchAllDomain ?? '')
    setEmailInput(settings.personalEmail ?? '')
    setPassInput(settings.personalEmailPassword ?? '')
  }, [settings.catchAllDomain, settings.personalEmail, settings.personalEmailPassword])

  const configured = !!settings.catchAllDomain
  const webmail = webmailFor(settings.personalEmail)

  // Auto-fill the webmail login if credentials are stored (handles getting signed out).
  useEffect(() => {
    const wv = ref.current
    if (!wv || !configured) return
    const email = settings.personalEmail ?? ''
    const pass = settings.personalEmailPassword ?? ''
    if (!email && !pass) return
    const fill = (): void => {
      wv.executeJavaScript(mailFillScript(email, pass)).catch(() => {})
    }
    wv.addEventListener('did-finish-load', fill)
    wv.addEventListener('did-navigate-in-page', fill)
    return () => {
      wv.removeEventListener('did-finish-load', fill)
      wv.removeEventListener('did-navigate-in-page', fill)
    }
  }, [configured, settings.personalEmail, settings.personalEmailPassword])

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
                alias. All of it forwards to one <b className="text-slate-300">dedicated</b> account you control, and GhostWire
                signs into that account right here — so every persona’s mail lands in one in-app inbox, never your personal one.
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
                <label className="label">Dedicated receiving account</label>
                <input className="input" placeholder="yourcrew.osint@gmail.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value.trim())} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Account password (optional — auto sign-in)</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPass ? 'text' : 'password'}
                    placeholder="So GhostWire re-fills the login if you get signed out"
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    onClick={() => setShowPass((v) => !v)}
                    title={showPass ? 'Hide' : 'Show'}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Stored locally in plaintext. GhostWire only fills it into this account’s webmail login — leave blank to sign in manually.
                </p>
              </div>
            </div>
            <button
              className="btn-primary mt-3"
              disabled={!domainInput.trim()}
              onClick={() => update({ catchAllDomain: domainInput.trim(), personalEmail: emailInput.trim(), personalEmailPassword: passInput })}
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
