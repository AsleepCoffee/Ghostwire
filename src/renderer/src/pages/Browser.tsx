import { useCallback, useEffect, useRef, useState } from 'react'
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
  AlertTriangle,
  KeyRound,
  Camera,
  Shield
} from 'lucide-react'
import { api, type Persona, type VpnConfigStatus } from '../lib/api'
import { personaColor } from '../lib/constants'
import { consumePending, subscribeOpen, type OpenRequest, type Autofill } from '../lib/browserBus'
import { useSettings } from '../lib/settings'

const HOME = 'https://duckduckgo.com/'

interface WebviewEl extends HTMLElement {
  goBack(): void
  goForward(): void
  reload(): void
  stop(): void
  loadURL(url: string): Promise<void>
  getURL(): string
  executeJavaScript(code: string): Promise<unknown>
  capturePage(): Promise<{ toDataURL(): string }>
}

interface Tab {
  id: string
  url: string
  title: string
  loading: boolean
  failed: boolean
  personaId?: string
  autofill?: Autofill
}

function toUrl(input: string): string {
  const s = input.trim()
  if (!s) return HOME
  if (/^https?:\/\//i.test(s)) return s
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(s)) return `https://${s}`
  return `https://duckduckgo.com/?q=${encodeURIComponent(s)}`
}

/** A page script that fills login AND sign-up fields with a persona's details.
 *  It only writes into empty fields, so it is safe to run on every navigation and
 *  it cooperates with two-step (email-then-password) flows. */
function fillScript(a: Autofill): string {
  const data = JSON.stringify({
    username: a.username ?? '',
    password: a.password ?? '',
    email: a.email ?? (a.username && a.username.includes('@') ? a.username : ''),
    firstName: a.firstName ?? '',
    lastName: a.lastName ?? '',
    fullName: a.fullName ?? '',
    birthdate: a.birthdate ?? '',
    gender: a.gender ?? '',
    phone: a.phone ?? ''
  })
  return `(function(){
    try {
      var D=${data};
      function visible(el){ return el && el.offsetParent !== null && !el.disabled && !el.readOnly; }
      function setVal(el, val){
        if(!visible(el) || !val || el.value) return false;
        el.focus();
        var proto = el instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        var setter = Object.getOwnPropertyDescriptor(proto,'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
        return true;
      }
      function first(sel){ try { return document.querySelector(sel); } catch(e){ return null; } }
      function all(sel){ try { return Array.prototype.slice.call(document.querySelectorAll(sel)); } catch(e){ return []; } }

      function tick(){
      // ---- Name fields ----
      setVal(first('input[autocomplete="given-name"], input[name*="first" i], input[id*="first" i], input[name="firstname"], input[aria-label*="first name" i]'), D.firstName);
      setVal(first('input[autocomplete="family-name"], input[name*="last" i], input[id*="last" i], input[name="lastname"], input[aria-label*="last name" i]'), D.lastName);
      if(D.fullName) setVal(first('input[autocomplete="name"], input[name="name"], input[id="name"], input[aria-label*="full name" i]'), D.fullName);

      // ---- Email (+ confirm email) ----
      if(D.email){
        var emails = all('input[type="email"], input[autocomplete="email"], input[name*="email" i], input[id*="email" i]');
        emails.forEach(function(el){ setVal(el, D.email); });
      }

      // ---- Username (a user/login field that is NOT the email) ----
      if(D.username){
        var userEl = first('input[autocomplete="username"], input[name="login"], input[name*="user" i]:not([type="email"]), input[id*="user" i]:not([type="email"])');
        if(userEl && (userEl.type||'').toLowerCase() !== 'email') setVal(userEl, D.username);
      }

      // ---- Phone ----
      if(D.phone) setVal(first('input[type="tel"], input[autocomplete="tel"], input[name*="phone" i], input[id*="phone" i]'), D.phone);

      // ---- Passwords: fill every empty password box (password + confirm) ----
      if(D.password){
        all('input[type="password"]').forEach(function(el){ setVal(el, D.password); });
      }

      // ---- Birthdate (YYYY-MM-DD) ----
      if(D.birthdate && /^\\d{4}-\\d{2}-\\d{2}$/.test(D.birthdate)){
        var parts = D.birthdate.split('-'), Y=parts[0], M=String(parseInt(parts[1],10)), Dd=String(parseInt(parts[2],10));
        var dateInput = first('input[type="date"]');
        if(dateInput) setVal(dateInput, D.birthdate);
        function selectBy(el, value){
          if(!visible(el) || !value) return false;
          var opts = Array.prototype.slice.call(el.options||[]);
          var want = String(value);
          var hit = opts.find(function(o){
            return o.value===want || String(parseInt(o.value,10))===want || o.text.trim()===want || String(parseInt(o.text,10))===want;
          });
          if(hit){ el.value = hit.value; el.dispatchEvent(new Event('change',{bubbles:true})); return true; }
          return false;
        }
        selectBy(first('select[name*="day" i], select[id*="day" i], select[aria-label*="day" i]'), Dd);
        selectBy(first('select[name*="month" i], select[id*="month" i], select[aria-label*="month" i]'), M);
        selectBy(first('select[name*="year" i], select[id*="year" i], select[aria-label*="year" i]'), Y);
      }

      // ---- Gender (radios / select) ----
      if(D.gender){
        var g = D.gender.toLowerCase();
        var radios = all('input[type="radio"]');
        radios.forEach(function(r){
          var hay = ((r.value||'') + ' ' + (r.getAttribute('aria-label')||'') + ' ' + (r.name||'') + ' ' + ((r.labels&&r.labels[0]&&r.labels[0].innerText)||'')).toLowerCase();
          if(/sex|gender/.test((r.name||'').toLowerCase()) || /male|female/.test(hay)){
            if((g.indexOf('female')===0 && /female|f\\b|^2$/.test(hay)) || (g.indexOf('male')===0 && /\\bmale|^1$|^m\\b/.test(hay) && !/female/.test(hay))){
              if(!r.checked){ r.click(); }
            }
          }
        });
        var gsel = first('select[name*="gender" i], select[id*="gender" i], select[name*="sex" i]');
        if(gsel){
          var opt = Array.prototype.slice.call(gsel.options||[]).find(function(o){ return (o.text||'').toLowerCase().indexOf(g.split(' ')[0])>-1; });
          if(opt){ gsel.value = opt.value; gsel.dispatchEvent(new Event('change',{bubbles:true})); }
        }
      }
      }
      // Re-arm: sign-up wizards reveal fields on later steps, so keep filling
      // empty fields as the DOM changes (and via a backup poll) for ~60s.
      if (window.__gwFillObs) { try { window.__gwFillObs.disconnect(); } catch(e){} }
      if (window.__gwFillInt) clearInterval(window.__gwFillInt);
      window.__gwFillObs = new MutationObserver(tick);
      window.__gwFillObs.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['type','style','class'] });
      var __n = 0;
      window.__gwFillInt = setInterval(function(){ __n++; tick(); if (__n > 120) { clearInterval(window.__gwFillInt); try { window.__gwFillObs.disconnect(); } catch(e){} } }, 500);
      tick();
    } catch(e){}
  })();`
}

let tabSeq = 0
const newId = (): string => `tab_${Date.now()}_${tabSeq++}`

export function Browser(): JSX.Element {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [vpnConfigs, setVpnConfigs] = useState<VpnConfigStatus[]>([])
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [address, setAddress] = useState('')
  const [toast, setToast] = useState('')
  const refs = useRef<Map<string, WebviewEl>>(new Map())
  const { settings } = useSettings()

  const active = tabs.find((t) => t.id === activeId) ?? null

  const capture = async (): Promise<void> => {
    if (!active) return
    const wv = refs.current.get(active.id)
    if (!wv) return
    try {
      const img = await wv.capturePage()
      const ev = await api.evidence.capture({
        dataUrl: img.toDataURL(),
        sourceUrl: active.url,
        title: active.title,
        projectId: settings.activeProjectId ?? null
      })
      setToast(
        settings.activeProjectId
          ? 'Evidence captured & filed to the active investigation'
          : 'Evidence captured (set an active investigation to file it)'
      )
      setTimeout(() => setToast(''), 2800)
      void ev
    } catch {
      setToast('Capture failed')
      setTimeout(() => setToast(''), 2200)
    }
  }

  const reloadPersonas = (): void => {
    api.personas.list().then(setPersonas)
  }
  useEffect(() => {
    reloadPersonas()
    api.vpn.state().then((s) => setVpnConfigs(s.configs))
    return api.vpn.onStatus((s) => setVpnConfigs(s.configs))
  }, [])

  const openTabs = useCallback(
    (req: OpenRequest): void => {
      setTabs((prev) => {
        const created: Tab[] = req.tabs.map((t) => ({
          id: newId(),
          url: toUrl(t.url),
          title: 'Loading…',
          loading: true,
          failed: false,
          personaId: t.personaId,
          autofill: t.autofill
        }))
        if (created.length) setActiveId(created[0].id)
        return [...prev, ...created]
      })
    },
    []
  )

  // Deliver queued open-requests and subscribe for new ones. No default tab.
  useEffect(() => {
    const pending = consumePending()
    if (pending) openTabs(pending)
    const unsub = subscribeOpen(openTabs)
    return unsub
  }, [openTabs])

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
      if (id === activeId && next.length) setActiveId(next[Math.max(0, idx - 1)].id)
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
    updateTab(active.id, { personaId: personaId || undefined })
  }

  const persona = personas.find((p) => p.id === active?.personaId)
  const exit = persona?.vpnConfigId ? vpnConfigs.find((c) => c.id === persona.vpnConfigId) : undefined

  return (
    <div className="h-full flex flex-col relative">
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
          onClick={() => openTabs({ tabs: [{ url: HOME }] })}
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
            disabled={!active}
          />
        </form>

        {active?.autofill && (
          <button
            className="btn-ghost !px-2 text-accent"
            title="Re-fill persona details (login & sign-up forms)"
            onClick={() => active && refs.current.get(active.id)?.executeJavaScript(fillScript(active.autofill!))}
          >
            <KeyRound size={16} />
          </button>
        )}

        <button
          className="btn-ghost !px-2 text-accent"
          title="Capture page as evidence (URL + timestamp + SHA-256)"
          onClick={capture}
          disabled={!active}
        >
          <Camera size={17} />
        </button>

        <button
          className="btn-ghost !px-2"
          title="Open in system browser"
          onClick={() => active && api.shell.openExternal(active.url)}
          disabled={!active}
        >
          <ExternalLink size={17} />
        </button>

        <div className="relative">
          <select
            className="input !w-auto pl-9 pr-8 py-1.5 text-sm"
            value={active?.personaId ?? ''}
            onChange={(e) => setPersona(e.target.value)}
            title="Session identity for this tab"
            disabled={!active}
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
          {exit && (
            <span
              className={`flex items-center gap-1 ${exit.running ? 'text-ok' : 'text-danger'}`}
              title={exit.running ? `Exiting via ${exit.name}` : `${exit.name} tunnel is down — tab will fail closed`}
            >
              <Shield size={12} /> {exit.name}{exit.running ? '' : ' (down)'}
            </span>
          )}
          {active?.autofill && <span className="ml-auto text-slate-500">persona details auto-filled 🔑</span>}
        </div>
      )}

      {/* Webviews — all mounted; only active visible so background tabs keep loading */}
      <div className="flex-1 min-h-0 relative bg-white">
        {tabs.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950 text-slate-500 gap-3">
            <Globe size={32} className="text-slate-600" />
            <div>No tabs open.</div>
            <button className="btn-primary" onClick={() => openTabs({ tabs: [{ url: HOME }] })}>
              <Plus size={16} /> New tab
            </button>
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

      {toast && (
        <div className="absolute bottom-5 right-5 z-50 card px-4 py-2.5 text-sm text-slate-200 border-accent/40 shadow-xl">
          {toast}
        </div>
      )}
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
    const onFinish = (): void => {
      // Idempotent autofill (only fills empty fields). executeJavaScript throws
      // synchronously if the guest isn't ready, so guard it (a .catch only
      // handles the promise rejection).
      if (!tab.autofill) return
      try {
        const r = wv.executeJavaScript(fillScript(tab.autofill)) as Promise<unknown> | undefined
        if (r && typeof r.catch === 'function') r.catch(() => {})
      } catch {
        /* not dom-ready yet — a later event retries */
      }
    }
    const onFail = (e: Event): void => {
      const ev = e as unknown as { errorCode: number; isMainFrame: boolean }
      if (ev.isMainFrame && ev.errorCode !== -3) onState({ loading: false, failed: true })
    }
    const onNavFill = (e: Event): void => {
      onNav(e)
      onFinish()
    }
    wv.addEventListener('did-navigate', onNavFill as EventListener)
    wv.addEventListener('did-navigate-in-page', onNavFill as EventListener)
    wv.addEventListener('dom-ready', onFinish)
    wv.addEventListener('did-start-loading', onStart)
    wv.addEventListener('did-stop-loading', onStop)
    wv.addEventListener('did-finish-load', onFinish)
    wv.addEventListener('page-title-updated', onTitle as EventListener)
    wv.addEventListener('did-fail-load', onFail as EventListener)
    return () => {
      wv.removeEventListener('did-navigate', onNavFill as EventListener)
      wv.removeEventListener('did-navigate-in-page', onNavFill as EventListener)
      wv.removeEventListener('dom-ready', onFinish)
      wv.removeEventListener('did-start-loading', onStart)
      wv.removeEventListener('did-stop-loading', onStop)
      wv.removeEventListener('did-finish-load', onFinish)
      wv.removeEventListener('page-title-updated', onTitle as EventListener)
      wv.removeEventListener('did-fail-load', onFail as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partition, tab.autofill])

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
