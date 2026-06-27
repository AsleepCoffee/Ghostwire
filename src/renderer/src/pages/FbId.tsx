import { useState } from 'react'
import { Fingerprint, Loader2, Search, DownloadCloud, Copy, Check, ExternalLink, Workflow } from 'lucide-react'
import { api, type FacebookId } from '../lib/api'
import { useOpenInBrowser, readActiveTabHtml } from '../lib/browserBus'
import { useSettings } from '../lib/settings'
import { addToInvestigation, type AddEntity } from '../lib/investigation'

const enc = encodeURIComponent
type Platform = 'facebook' | 'instagram'

// --- Facebook patterns ---
function fbId(html: string): string {
  const m =
    html.match(/"userID":"(\d+)"/) ||
    html.match(/"entity_id":"(\d+)"/) ||
    html.match(/"pageID":"(\d+)"/) ||
    html.match(/"actorID":"(\d+)"/) ||
    html.match(/fb:\/\/(?:profile|page|group)\/(\d+)/) ||
    html.match(/profile_id=(\d+)/)
  return m ? m[1] : ''
}
function fbVanity(html: string): string {
  const v = html.match(/"vanity":"([^"]+)"/) || html.match(/content="https:\/\/www\.facebook\.com\/([^"/?]+)\/?"/)
  return v && !/^profile\.php/.test(v[1]) && !/^\d+$/.test(v[1]) ? v[1] : ''
}
// --- Instagram patterns ---
function igId(html: string): string {
  const m =
    html.match(/instagram:\/\/user\?id=(\d+)/) ||
    html.match(/"profile_id":"(\d+)"/) ||
    html.match(/"owner":\{"id":"(\d+)"/) ||
    html.match(/"user_id":"(\d+)"/) ||
    html.match(/profilePage_(\d+)/) ||
    html.match(/"id":"(\d+)","username"/)
  return m ? m[1] : ''
}
function igUser(html: string): string {
  const v = html.match(/"username":"([^"]+)"/)
  return v ? v[1] : ''
}

const PLATFORMS: Record<Platform, { name: string; byId: (id: string) => string; byName: (n: string) => string }> = {
  facebook: {
    name: 'Facebook',
    byId: (id) => `https://www.facebook.com/profile.php?id=${id}`,
    byName: (n) => `https://www.facebook.com/${n}`
  },
  instagram: {
    name: 'Instagram',
    byId: (id) => `https://www.instagram.com/web/profile/${id}/`,
    byName: (n) => `https://www.instagram.com/${n}/`
  }
}

export function FbId(): JSX.Element {
  const openInBrowser = useOpenInBrowser()
  const { settings } = useSettings()
  const [platform, setPlatform] = useState<Platform>('facebook')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [id, setId] = useState('')
  const [vanity, setVanity] = useState('')
  const [copied, setCopied] = useState('')
  const [toast, setToast] = useState('')

  const flash = (m: string): void => {
    setToast(m)
    setTimeout(() => setToast(''), 3000)
  }

  // Push the resolved profile into the investigation: the vanity as a username
  // and the profile itself (with its numeric id + URL) as a social account.
  const addProfile = async (): Promise<void> => {
    const P = PLATFORMS[platform]
    const entities: AddEntity[] = []
    if (vanity) entities.push({ type: 'username', label: vanity })
    const profileLabel = vanity || id
    if (profileLabel)
      entities.push({
        type: 'social',
        label: `${P.name}: ${profileLabel}`,
        props: { platform: P.name, id, vanity, url: id ? P.byId(id) : P.byName(vanity) }
      })
    if (!entities.length) return
    const r = await addToInvestigation({ projectId: settings.activeProjectId ?? null, entities })
    flash(settings.activeProjectId ? `Added ${r.nodes} node${r.nodes === 1 ? '' : 's'} to the investigation` : 'Added to a chart — set an active investigation to file it')
  }

  const reset = (): void => {
    setErr('')
    setId('')
    setVanity('')
  }

  // Auto-switch platform from a pasted URL.
  const onInput = (val: string): void => {
    setInput(val)
    if (/instagram\.com/i.test(val)) setPlatform('instagram')
    else if (/facebook\.com|fb\.com/i.test(val)) setPlatform('facebook')
  }

  const resolve = async (): Promise<void> => {
    if (!input.trim()) return
    reset()
    setBusy('resolve')
    try {
      const r: FacebookId = platform === 'instagram' ? await api.intel.instagramId(input.trim()) : await api.intel.facebookId(input.trim())
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
        setErr('No open browser tab to read. Open the profile in the in-app browser first.')
        return
      }
      const isIg = /instagram\.com/i.test(snap.url)
      const plat: Platform = isIg ? 'instagram' : 'facebook'
      setPlatform(plat)
      let foundId = isIg ? igId(snap.html) : fbId(snap.html)
      let foundName = isIg ? igUser(snap.html) : fbVanity(snap.html)
      try {
        const u = new URL(snap.url)
        const idp = u.searchParams.get('id')
        const seg = u.pathname.split('/').filter(Boolean)[0] ?? ''
        if (!foundId && idp && /^\d+$/.test(idp)) foundId = idp
        if (!foundName && seg && seg !== 'profile.php' && !/^\d+$/.test(seg)) foundName = decodeURIComponent(seg)
      } catch {
        /* ignore */
      }
      if (!foundId && !foundName) {
        setErr(`Couldn't find an ID on “${snap.url}”. Make sure a Facebook or Instagram profile is the active tab.`)
        return
      }
      if (!input.trim()) setInput(snap.url)
      setId(foundId)
      setVanity(foundName)
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

  const P = PLATFORMS[platform]

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-ink-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Fingerprint size={20} className="text-brand-glow" /> Profile ID
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Pull the numeric user ID and the username/vanity from a Facebook or Instagram profile. Paste a URL/username, or
          open the profile in the in-app browser and grab it from the page.
        </p>
      </div>

      <div className="p-6 max-w-2xl space-y-4">
        <div className="flex rounded-lg border border-ink-600 overflow-hidden w-fit">
          {(['facebook', 'instagram'] as Platform[]).map((p) => (
            <button
              key={p}
              className={`px-3 py-1.5 text-sm ${platform === p ? 'bg-brand/15 text-brand-glow' : 'text-slate-400 hover:bg-ink-800'}`}
              onClick={() => setPlatform(p)}
            >
              {PLATFORMS[p].name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder={platform === 'instagram' ? 'instagram.com/username, or a username' : 'facebook.com/zuck, a profile.php?id= URL, or a username'}
            value={input}
            onChange={(e) => onInput(e.target.value)}
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
            {id && <Row label={`${P.name} numeric ID`} value={id} openUrl={P.byId(id)} />}
            {vanity && <Row label="Username / vanity" value={vanity} openUrl={P.byName(vanity)} />}
            {id && !vanity && <p className="text-[11px] text-slate-500">No username found — this profile is reachable by its numeric ID.</p>}
            <button className="btn-primary w-full justify-center" onClick={addProfile}>
              <Workflow size={15} /> Add to investigation
            </button>
          </div>
        )}

        <div className="card p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">If a profile won’t resolve</div>
          <p className="text-xs text-slate-400">
            Facebook and Instagram require login for most profiles, so the server lookup can fail. Open the profile in the
            in-app browser (as your sock puppet) and use “Grab from the open tab”, or try a dedicated resolver:
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {platform === 'facebook' ? (
              <>
                <button className="btn-ghost border border-ink-600 text-xs" onClick={() => openInBrowser([input.trim() ? `https://lookup-id.com/#${enc(input.trim())}` : 'https://lookup-id.com/'])}>
                  <ExternalLink size={12} /> lookup-id.com
                </button>
                <button className="btn-ghost border border-ink-600 text-xs" onClick={() => openInBrowser(['https://findidfb.com/'])}>
                  <ExternalLink size={12} /> findidfb.com
                </button>
              </>
            ) : (
              <>
                <button className="btn-ghost border border-ink-600 text-xs" onClick={() => openInBrowser([input.trim() ? `https://imginn.com/${enc(input.trim().replace(/^@/, '').replace(/^.*instagram\.com\//, '').replace(/\/.*$/, ''))}/` : 'https://imginn.com/'])}>
                  <ExternalLink size={12} /> Imginn
                </button>
                <button className="btn-ghost border border-ink-600 text-xs" onClick={() => openInBrowser(['https://commentpicker.com/instagram-user-id.php'])}>
                  <ExternalLink size={12} /> CommentPicker
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {toast && <div className="fixed bottom-5 right-5 z-40 card px-4 py-2.5 text-sm text-slate-200 border-accent/40 shadow-xl">{toast}</div>}
    </div>
  )
}
