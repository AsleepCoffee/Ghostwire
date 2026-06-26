import { useState } from 'react'
import { Fingerprint, Loader2, Search, DownloadCloud, Copy, Check, ExternalLink } from 'lucide-react'
import { api } from '../lib/api'
import { useOpenInBrowser, readActiveTabHtml } from '../lib/browserBus'

const enc = encodeURIComponent

function parseId(html: string): string {
  const m =
    html.match(/"userID":"(\d+)"/) ||
    html.match(/"entity_id":"(\d+)"/) ||
    html.match(/"pageID":"(\d+)"/) ||
    html.match(/"actorID":"(\d+)"/) ||
    html.match(/fb:\/\/(?:profile|page|group)\/(\d+)/) ||
    html.match(/profile_id=(\d+)/) ||
    html.match(/"identifier":(\d+)/)
  return m ? m[1] : ''
}
function parseVanity(html: string): string {
  const v =
    html.match(/"vanity":"([^"]+)"/) ||
    html.match(/content="https:\/\/www\.facebook\.com\/([^"/?]+)\/?"/) ||
    html.match(/"username":"([^"]+)"/)
  return v && !/^profile\.php/.test(v[1]) && !/^\d+$/.test(v[1]) ? v[1] : ''
}

export function FbId(): JSX.Element {
  const openInBrowser = useOpenInBrowser()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [id, setId] = useState('')
  const [vanity, setVanity] = useState('')
  const [copied, setCopied] = useState('')

  const reset = (): void => {
    setErr('')
    setId('')
    setVanity('')
  }

  const resolve = async (): Promise<void> => {
    if (!input.trim()) return
    reset()
    setBusy('resolve')
    try {
      const r = await api.intel.facebookId(input.trim())
      if (!r.ok) setErr(r.error || 'Could not resolve.')
      else {
        setId(r.id || '')
        setVanity(r.vanity || '')
      }
    } finally {
      setBusy('')
    }
  }

  const grabFromTab = async (): Promise<void> => {
    reset()
    setBusy('grab')
    try {
      const snap = await readActiveTabHtml()
      if (!snap) {
        setErr('No open browser tab to read. Open the Facebook profile in the in-app browser first.')
        return
      }
      let foundId = parseId(snap.html)
      let foundVanity = parseVanity(snap.html)
      // Fall back to the tab URL for id/vanity.
      try {
        const u = new URL(snap.url)
        const idp = u.searchParams.get('id')
        if (!foundId && idp && /^\d+$/.test(idp)) foundId = idp
        const seg = u.pathname.split('/').filter(Boolean)[0] ?? ''
        if (!foundVanity && seg && seg !== 'profile.php' && !/^\d+$/.test(seg)) foundVanity = decodeURIComponent(seg)
      } catch {
        /* ignore */
      }
      if (!foundId && !foundVanity) {
        setErr(`Couldn't find an ID on “${snap.url}”. Make sure a Facebook profile is the active tab.`)
        return
      }
      if (input.trim() === '') setInput(snap.url)
      setId(foundId)
      setVanity(foundVanity)
    } finally {
      setBusy('')
    }
  }

  const copy = (val: string): void => {
    api.clipboard.writeText(val)
    setCopied(val)
    setTimeout(() => setCopied(''), 1200)
  }

  const Row = ({ label, value, openUrl }: { label: string; value: string; openUrl?: string }): JSX.Element => (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-700 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
        <div className="text-sm text-slate-100 font-mono break-all">{value}</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button className="btn-ghost !p-1.5" title="Copy" onClick={() => copy(value)}>
          {copied === value ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
        </button>
        {openUrl && (
          <button className="btn-ghost !p-1.5" title="Open profile in browser" onClick={() => openInBrowser([openUrl])}>
            <ExternalLink size={14} />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-ink-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Fingerprint size={20} className="text-brand-glow" /> Facebook ID
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Pull the numeric user ID and the vanity (custom username) from a Facebook profile. Paste a URL/username, or open
          the profile in the in-app browser and grab it from the page.
        </p>
      </div>

      <div className="p-6 max-w-2xl space-y-4">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="facebook.com/zuck, a profile.php?id= URL, or a username"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && resolve()}
          />
          <button className="btn-primary" onClick={resolve} disabled={!input.trim() || !!busy}>
            {busy === 'resolve' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Resolve
          </button>
        </div>
        <button className="btn-ghost border border-ink-600 w-full justify-center" onClick={grabFromTab} disabled={!!busy}>
          {busy === 'grab' ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />} Grab from the open browser tab
        </button>

        {err && <div className="card p-3 text-sm text-warn">{err}</div>}

        {(id || vanity) && (
          <div className="space-y-2">
            {id && <Row label="Numeric ID" value={id} openUrl={`https://www.facebook.com/profile.php?id=${id}`} />}
            {vanity && <Row label="Vanity (username)" value={vanity} openUrl={`https://www.facebook.com/${vanity}`} />}
            {id && !vanity && <p className="text-[11px] text-slate-500">No custom username set (or not exposed) — this profile uses its numeric ID.</p>}
          </div>
        )}

        <div className="card p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">If a profile won’t resolve</div>
          <p className="text-xs text-slate-400">
            Facebook requires login for most profiles, so the server lookup can fail. Open the profile in the in-app
            browser (as your sock puppet) and use “Grab from the open tab”, or try a dedicated resolver:
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <button className="btn-ghost border border-ink-600 text-xs" onClick={() => openInBrowser([input.trim() ? `https://lookup-id.com/#${enc(input.trim())}` : 'https://lookup-id.com/'])}>
              <ExternalLink size={12} /> lookup-id.com
            </button>
            <button className="btn-ghost border border-ink-600 text-xs" onClick={() => openInBrowser(['https://findidfb.com/'])}>
              <ExternalLink size={12} /> findidfb.com
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
