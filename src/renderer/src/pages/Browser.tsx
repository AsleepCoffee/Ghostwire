import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Globe,
  Fingerprint,
  ShieldCheck,
  Lock,
  Plus,
  X,
  ExternalLink,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { api, type Persona } from '../lib/api'
import { personaColor } from '../lib/constants'
import { consumePending, subscribeOpen, type OpenRequest } from '../lib/browserBus'

const HOME = 'https://duckduckgo.com/'

interface WebviewEl extends HTMLElement {
  goBack(): void
  goForward(): void
  reload(): void
  stop(): void
  loadURL(url: string): Promise<void>
  getURL(): string
}

interface Tab {
  id: string
  url: string
  title: string
  loading: boolean
  failed: boolean
  personaId?: string
}

function toUrl(input: string): string {
  const s = input.trim()
  if (!s) return HOME
  if (/^https?:\/\//i.test(s)) return s
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(s)) return `https://${s}`
  return `https://duckduckgo.com/?q=${encodeURIComponent(s)}`
}

let tabSeq = 0
const newId = (): string => `tab_${Date.now()}_${tabSeq++}`

export function Browser(): JSX.Element {
  const [params] = useSearchParams()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [address, setAddress] = useState('')
  const refs = useRef<Map<string, WebviewEl>>(new Map())

  const active = tabs.find((t) => t.id === activeId) ?? null

  useEffect(() => {
    api.personas.list().then(setPersonas)
  }, [])

  const openTabs = useCallback((urls: string[], personaId?: string): void => {
    setTabs((prev) => {
      const created = urls.map((u) => ({
        id: newId(),
        url: toUrl(u),
        title: 'Loading…',
        loading: true,
        failed: false,
        personaId
      }))
      if (created.length) setActiveId(created[0].id)
      return [...prev, ...created]
    })
  }, [])

  // Initial: consume any pending open request, query params, or open a blank home tab.
  useEffect(() => {
    const pending = consumePending()
    const pid = params.get('persona') ?? undefined
    const q = params.get('q')
    const url = params.get('url')
    if (pending) {
      openTabs(pending.urls, pending.personaId)
    } else if (url) {
      openTabs([url], pid)
    } else if (q) {
      openTabs([`https://duckduckgo.com/?q=${encodeURIComponent(q)}`], pid)
    } else {
      openTabs([HOME], pid)
    }
    const unsub = subscribeOpen((r: OpenRequest) => openTabs(r.urls, r.personaId))
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the address bar in sync with the active tab.
  useEffect(() => {
    if (active) setAddress(active.url)
  }, [activeId, active?.url]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateTab = useCallback((id: string, patch: Partial<Tab>): void => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const closeTab = (id: string): void => {
    refs.current.delete(id)
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      const next = prev.filter((t) => t.id !== id)
      if (id === activeId && next.length) {
        setActiveId(next[Math.max(0, idx - 1)].id)
      }
      return next
    })
  }

  const go = (input: string): void => {
    if (!active) return
    const target = toUrl(input)
    updateTab(active.id, { url: target, failed: false })
    refs.current.get(active.id)?.loadURL(target).catch(() => {})
  }

  const setPersona = (personaId: string): void => {
    if (!active) return
    // Changing identity remounts this tab's webview (key includes persona) → reload from current url.
    updateTab(active.id, { personaId: personaId || undefined })
  }

  const persona = personas.find((p) => p.id === active?.personaId)

  return (
    <div className="h-full flex flex-col">
      {/* Tab strip */}
      <div className="flex items-center gap-1 px-2 pt-2 bg-ink-900 border-b border-ink-700 overflow-x-auto">
        {tabs.map((t) => {
          const p = personas.find((pp) => pp.id === t.personaId)
          return (
            <div
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`group flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-t-lg text-sm cursor-pointer max-w-[200px] border-t border-x ${
                t.id === activeId
                  ? 'bg-ink-850 border-ink-700 text-slate-100'
                  : 'bg-transparent border-transparent text-slate-400 hover:bg-ink-800'
              }`}
            >
              {p ? (
                <Fingerprint size={13} style={{ color: personaColor(p.id) }} className="shrink-0" />
              ) : t.loading ? (
                <Loader2 size={13} className="animate-spin shrink-0 text-slate-500" />
              ) : t.failed ? (
                <AlertTriangle size={13} className="shrink-0 text-warn" />
              ) : (
                <Globe size={13} className="shrink-0 text-slate-500" />
              )}
              <span className="truncate flex-1">{t.title || 'New tab'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(t.id)
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-ink-600 rounded p-0.5 shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          )
        })}
        <button
          onClick={() => openTabs([HOME])}
          className="ml-1 mb-1 p-1.5 rounded-lg text-slate-400 hover:bg-ink-800 shrink-0"
          title="New tab"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-700 bg-ink-900">
        <button className="btn-ghost !px-2" onClick={() => refs.current.get(activeId)?.goBack()}>
          <ArrowLeft size={18} />
        </button>
        <button className="btn-ghost !px-2" onClick={() => refs.current.get(activeId)?.goForward()}>
          <ArrowRight size={18} />
        </button>
        <button
          className="btn-ghost !px-2"
          onClick={() => (active?.loading ? refs.current.get(activeId)?.stop() : refs.current.get(activeId)?.reload())}
        >
          <RotateCw size={17} className={active?.loading ? 'animate-spin' : ''} />
        </button>
        <button className="btn-ghost !px-2" onClick={() => go(HOME)}>
          <Home size={17} />
        </button>

        <form className="flex-1 relative" onSubmit={(e) => (e.preventDefault(), go(address))}>
          <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-8 pr-3 bg-ink-850 font-mono text-xs"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Search or enter address"
            spellCheck={false}
          />
        </form>

        <button
          className="btn-ghost !px-2"
          title="Open in system browser"
          onClick={() => active && api.shell.openExternal(active.url)}
        >
          <ExternalLink size={17} />
        </button>

        <div className="relative">
          <select
            className="input !w-auto pl-9 pr-8 py-1.5 text-sm"
            value={active?.personaId ?? ''}
            onChange={(e) => setPersona(e.target.value)}
            title="Session identity for this tab"
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
      {persona && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 text-xs border-b border-ink-700"
          style={{ background: `${personaColor(persona.id)}14` }}
        >
          <Fingerprint size={13} style={{ color: personaColor(persona.id) }} />
          <span className="text-slate-300">
            This tab browses as <b style={{ color: personaColor(persona.id) }}>{persona.name}</b> — isolated
            cookies & storage.
          </span>
        </div>
      )}

      {/* Webviews (all mounted; only active is visible so background tabs keep loading) */}
      <div className="flex-1 min-h-0 relative bg-white">
        {tabs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950 text-slate-500">
            No tabs open.
          </div>
        )}
        {tabs.map((t) => (
          <BrowserView
            key={t.id}
            tab={t}
            active={t.id === activeId}
            personas={personas}
            registerRef={(el) => {
              if (el) refs.current.set(t.id, el)
              else refs.current.delete(t.id)
            }}
            onState={(patch) => updateTab(t.id, patch)}
            onExternal={() => api.shell.openExternal(t.url)}
          />
        ))}
      </div>
    </div>
  )
}

function BrowserView({
  tab,
  active,
  personas,
  registerRef,
  onState,
  onExternal
}: {
  tab: Tab
  active: boolean
  personas: Persona[]
  registerRef: (el: WebviewEl | null) => void
  onState: (patch: Partial<Tab>) => void
  onExternal: () => void
}): JSX.Element {
  const persona = personas.find((p) => p.id === tab.personaId)
  const partition = persona ? persona.partition : 'persist:default-browser'
  const localRef = useRef<WebviewEl | null>(null)

  const attach = useCallback(
    (el: WebviewEl | null) => {
      localRef.current = el
      registerRef(el)
    },
    [registerRef]
  )

  useEffect(() => {
    const wv = localRef.current
    if (!wv) return
    const onNav = (e: Event): void => {
      const u = (e as unknown as { url: string }).url
      onState({ url: u, failed: false })
    }
    const onStart = (): void => onState({ loading: true })
    const onStop = (): void => onState({ loading: false })
    const onTitle = (e: Event): void => onState({ title: (e as unknown as { title: string }).title })
    const onFail = (e: Event): void => {
      const ev = e as unknown as { errorCode: number; isMainFrame: boolean }
      if (ev.isMainFrame && ev.errorCode !== -3) onState({ loading: false, failed: true })
    }
    wv.addEventListener('did-navigate', onNav as EventListener)
    wv.addEventListener('did-navigate-in-page', onNav as EventListener)
    wv.addEventListener('did-start-loading', onStart)
    wv.addEventListener('did-stop-loading', onStop)
    wv.addEventListener('page-title-updated', onTitle as EventListener)
    wv.addEventListener('did-fail-load', onFail as EventListener)
    return () => {
      wv.removeEventListener('did-navigate', onNav as EventListener)
      wv.removeEventListener('did-navigate-in-page', onNav as EventListener)
      wv.removeEventListener('did-start-loading', onStart)
      wv.removeEventListener('did-stop-loading', onStop)
      wv.removeEventListener('page-title-updated', onTitle as EventListener)
      wv.removeEventListener('did-fail-load', onFail as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partition])

  return (
    <div className="absolute inset-0" style={{ display: active ? 'block' : 'none' }}>
      {tab.failed && active && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink-950 text-center p-6">
          <AlertTriangle size={36} className="text-warn mb-3" />
          <h3 className="text-slate-200 font-semibold">This site wouldn’t load in the in-app browser</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            It may block embedding or require a different context. Open it in your system browser instead.
          </p>
          <button className="btn-primary mt-4" onClick={onExternal}>
            <ExternalLink size={16} /> Open in system browser
          </button>
        </div>
      )}
      <webview
        key={partition}
        ref={attach as never}
        src={tab.url}
        partition={partition}
        allowpopups="true"
        style={{ width: '100%', height: '100%', display: 'inline-flex' }}
      />
    </div>
  )
}
