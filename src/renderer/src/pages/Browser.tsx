import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Globe,
  Fingerprint,
  ShieldCheck,
  Lock
} from 'lucide-react'
import { api, type Persona } from '../lib/api'
import { personaColor } from '../lib/constants'

const HOME = 'https://duckduckgo.com/'

interface WebviewEl extends HTMLElement {
  src: string
  goBack(): void
  goForward(): void
  reload(): void
  stop(): void
  loadURL(url: string): Promise<void>
  getURL(): string
  canGoBack(): boolean
  canGoForward(): boolean
}

/** Normalize an address-bar entry into a URL (search if it isn't one). */
function toUrl(input: string): string {
  const s = input.trim()
  if (!s) return HOME
  if (/^https?:\/\//i.test(s)) return s
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(s)) return `https://${s}`
  return `https://duckduckgo.com/?q=${encodeURIComponent(s)}`
}

export function Browser(): JSX.Element {
  const [params] = useSearchParams()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [personaId, setPersonaId] = useState<string>('')
  const [address, setAddress] = useState('')
  const [currentUrl, setCurrentUrl] = useState(HOME)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const ref = useRef<WebviewEl | null>(null)

  const persona = personas.find((p) => p.id === personaId)
  // Default session is shared; each persona gets its own isolated partition.
  const partition = persona ? persona.partition : 'persist:default-browser'

  useEffect(() => {
    api.personas.list().then(setPersonas)
  }, [])

  // Apply query params (?persona / ?q / ?url) once.
  useEffect(() => {
    const pid = params.get('persona')
    if (pid) setPersonaId(pid)
    const q = params.get('q')
    const url = params.get('url')
    if (url) {
      setAddress(url)
      setCurrentUrl(toUrl(url))
    } else if (q) {
      const target = `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
      setAddress(target)
      setCurrentUrl(target)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  // Wire webview events. Re-runs when partition changes (webview remounts via key).
  useEffect(() => {
    const wv = ref.current
    if (!wv) return
    const onNav = (e: Event & { url?: string }): void => {
      const u = (e as { url: string }).url
      setAddress(u)
      setCurrentUrl(u)
    }
    const onStart = (): void => setLoading(true)
    const onStop = (): void => setLoading(false)
    const onTitle = (e: Event & { title?: string }): void => setTitle((e as { title: string }).title)
    wv.addEventListener('did-navigate', onNav as EventListener)
    wv.addEventListener('did-navigate-in-page', onNav as EventListener)
    wv.addEventListener('did-start-loading', onStart)
    wv.addEventListener('did-stop-loading', onStop)
    wv.addEventListener('page-title-updated', onTitle as EventListener)
    return () => {
      wv.removeEventListener('did-navigate', onNav as EventListener)
      wv.removeEventListener('did-navigate-in-page', onNav as EventListener)
      wv.removeEventListener('did-start-loading', onStart)
      wv.removeEventListener('did-stop-loading', onStop)
      wv.removeEventListener('page-title-updated', onTitle as EventListener)
    }
  }, [partition])

  const go = (url: string): void => {
    const target = toUrl(url)
    setCurrentUrl(target)
    ref.current?.loadURL(target).catch(() => {})
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-700 bg-ink-900">
        <button className="btn-ghost !px-2" onClick={() => ref.current?.goBack()} title="Back">
          <ArrowLeft size={18} />
        </button>
        <button className="btn-ghost !px-2" onClick={() => ref.current?.goForward()} title="Forward">
          <ArrowRight size={18} />
        </button>
        <button
          className="btn-ghost !px-2"
          onClick={() => (loading ? ref.current?.stop() : ref.current?.reload())}
          title="Reload"
        >
          <RotateCw size={17} className={loading ? 'animate-spin' : ''} />
        </button>
        <button className="btn-ghost !px-2" onClick={() => go(HOME)} title="Home">
          <Home size={17} />
        </button>

        <form
          className="flex-1 relative"
          onSubmit={(e) => {
            e.preventDefault()
            go(address)
          }}
        >
          <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-8 pr-3 bg-ink-850 font-mono text-xs"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Search or enter address"
            spellCheck={false}
          />
        </form>

        {/* Persona session selector */}
        <div className="relative">
          <select
            className="input !w-auto pl-9 pr-8 py-1.5 text-sm"
            value={personaId}
            onChange={(e) => setPersonaId(e.target.value)}
            title="Active session identity"
          >
            <option value="">Default session</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (@{p.handle})
              </option>
            ))}
          </select>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {persona ? (
              <Fingerprint size={15} style={{ color: personaColor(persona.id) }} />
            ) : (
              <ShieldCheck size={15} className="text-slate-500" />
            )}
          </span>
        </div>
      </div>

      {/* Session banner */}
      <div
        className="flex items-center gap-2 px-4 py-1.5 text-xs border-b border-ink-700"
        style={{
          background: persona ? `${personaColor(persona.id)}14` : 'transparent'
        }}
      >
        {persona ? (
          <>
            <Fingerprint size={13} style={{ color: personaColor(persona.id) }} />
            <span className="text-slate-300">
              Browsing as <b style={{ color: personaColor(persona.id) }}>{persona.name}</b> — isolated
              cookies & storage. Logins persist only for this persona.
            </span>
          </>
        ) : (
          <>
            <Globe size={13} className="text-slate-500" />
            <span className="text-slate-500">
              Default shared session. Pick a persona above to browse with an isolated identity.
            </span>
          </>
        )}
        {title && <span className="ml-auto text-slate-500 truncate max-w-xs">{title}</span>}
      </div>

      {/* The guest webview. key=partition forces remount when identity changes. */}
      <div className="flex-1 min-h-0 bg-white">
        <webview
          key={partition}
          ref={ref as never}
          src={currentUrl}
          partition={partition}
          allowpopups="true"
          style={{ width: '100%', height: '100%', display: 'inline-flex' }}
        />
      </div>
    </div>
  )
}
