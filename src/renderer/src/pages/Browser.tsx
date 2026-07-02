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
  RefreshCw,
  Loader2,
  AlertTriangle,
  KeyRound,
  Camera,
  Shield,
  Copy,
  Check,
  Highlighter,
  BookmarkPlus,
  ScrollText,
  Library,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { api, type Persona, type VpnConfigStatus } from '../lib/api'
import { personaColor } from '../lib/constants'
import { consumePending, subscribeOpen, getPasteImage, subscribePasteImage, setPasteImage, registerTabReader, registerHtmlReader, type OpenRequest, type Autofill, type PasteImage } from '../lib/browserBus'
import { useSettings } from '../lib/settings'
import { OSINT_BOOKMARKS, type BmGroup } from '../lib/bookmarks'

const HOME = 'https://www.google.com/'
/** A fresh tab opens blank (no page load) so the address bar keeps focus — just
 *  like a regular browser's new-tab page. */
const NEWTAB = 'about:blank'

interface WebviewEl extends HTMLElement {
  goBack(): void
  goForward(): void
  reload(): void
  stop(): void
  loadURL(url: string): Promise<void>
  getURL(): string
  executeJavaScript(code: string): Promise<unknown>
  capturePage(rect?: { x: number; y: number; width: number; height: number }): Promise<{ toDataURL(): string }>
  getWebContentsId(): number
}

interface Tab {
  id: string
  /** Live URL (tracks navigation, drives the address bar). */
  url: string
  /** The URL the webview was created with — bound to <webview src> and never
   *  updated, so navigation/redirects don't rewrite src and re-trigger loads. */
  initialUrl: string
  title: string
  loading: boolean
  failed: boolean
  personaId?: string
  autofill?: Autofill
  /** Number of selector matches highlighted on this page. */
  hits?: number
}

function toUrl(input: string): string {
  const s = input.trim()
  if (!s) return HOME
  if (/^about:/i.test(s)) return s
  if (/^https?:\/\//i.test(s)) return s
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(s)) return `https://${s}`
  return `https://www.google.com/search?q=${encodeURIComponent(s)}`
}

/** A page script that fills login AND sign-up fields with a persona's details.
 *  Gentle by design: each field is filled at most ONCE (tracked across re-runs),
 *  it never calls focus() (so it can't steal your cursor or fight a re-rendering
 *  SPA like X), it leaves any field that already has a value alone, and the
 *  watcher is throttled and self-terminates. This avoids breaking sign-up flows. */
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
      // X/Twitter's sign-up is a fragile SPA that breaks when fields are set
      // programmatically — never autofill there (use the Persona Dock to copy).
      var H=(location.hostname||'').toLowerCase();
      if(/(^|\\.)(x|twitter)\\.com$/.test(H)) return;
      var D=${data};
      var F = (window.__gwFilled = window.__gwFilled || {});
      function visible(el){ return el && el.offsetParent !== null && !el.disabled && !el.readOnly; }
      // Set a field once. Never focuses (no cursor stealing); if it already has a
      // value (user typed, or a previous run set it), mark done and leave it.
      function setVal(key, el, val){
        if(F[key] || !visible(el) || !val) return;
        if(el.value){ F[key]=true; return; }
        var proto = el instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        var setter = Object.getOwnPropertyDescriptor(proto,'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
        F[key]=true;
      }
      function selectBy(key, el, value){
        if(F[key] || !visible(el) || !value) return;
        var opts = Array.prototype.slice.call(el.options||[]);
        var want = String(value);
        var hit = opts.find(function(o){
          return o.value===want || String(parseInt(o.value,10))===want || (o.text||'').trim()===want || String(parseInt(o.text,10))===want;
        });
        if(hit){ el.value = hit.value; el.dispatchEvent(new Event('change',{bubbles:true})); F[key]=true; }
      }
      function first(sel){ try { return document.querySelector(sel); } catch(e){ return null; } }
      function all(sel){ try { return Array.prototype.slice.call(document.querySelectorAll(sel)); } catch(e){ return []; } }

      function tick(){
        setVal('first', first('input[autocomplete="given-name"], input[name*="first" i], input[id*="first" i], input[name="firstname"], input[aria-label*="first name" i]'), D.firstName);
        setVal('last', first('input[autocomplete="family-name"], input[name*="last" i], input[id*="last" i], input[name="lastname"], input[aria-label*="last name" i]'), D.lastName);
        if(D.fullName) setVal('full', first('input[autocomplete="name"], input[name="name"], input[id="name"], input[aria-label*="full name" i]'), D.fullName);

        if(D.email){
          all('input[type="email"], input[autocomplete="email"], input[name*="email" i], input[id*="email" i]').forEach(function(el,i){ setVal('email'+i, el, D.email); });
        }

        if(D.username){
          var userEl = first('input[autocomplete="username"], input[name="login"], input[name*="user" i]:not([type="email"]), input[id*="user" i]:not([type="email"])');
          if(userEl && (userEl.type||'').toLowerCase() !== 'email') setVal('user', userEl, D.username);
        }

        if(D.phone) setVal('phone', first('input[type="tel"], input[autocomplete="tel"], input[name*="phone" i], input[id*="phone" i]'), D.phone);

        if(D.password){
          all('input[type="password"]').forEach(function(el,i){ setVal('pw'+i, el, D.password); });
        }

        if(D.birthdate && /^\\d{4}-\\d{2}-\\d{2}$/.test(D.birthdate)){
          var parts = D.birthdate.split('-'), Y=parts[0], M=String(parseInt(parts[1],10)), Dd=String(parseInt(parts[2],10));
          setVal('dob', first('input[type="date"]'), D.birthdate);
          selectBy('dob-d', first('select[name*="day" i], select[id*="day" i], select[aria-label*="day" i]'), Dd);
          selectBy('dob-m', first('select[name*="month" i], select[id*="month" i], select[aria-label*="month" i]'), M);
          selectBy('dob-y', first('select[name*="year" i], select[id*="year" i], select[aria-label*="year" i]'), Y);
        }

        if(D.gender && !F.gender){
          var g = D.gender.toLowerCase(), done=false;
          all('input[type="radio"]').forEach(function(r){
            var hay = ((r.value||'') + ' ' + (r.getAttribute('aria-label')||'') + ' ' + (r.name||'') + ' ' + ((r.labels&&r.labels[0]&&r.labels[0].innerText)||'')).toLowerCase();
            if(/sex|gender/.test((r.name||'').toLowerCase()) || /male|female/.test(hay)){
              if((g.indexOf('female')===0 && /female|f\\b|^2$/.test(hay)) || (g.indexOf('male')===0 && /\\bmale|^1$|^m\\b/.test(hay) && !/female/.test(hay))){
                if(!r.checked){ r.click(); done=true; }
              }
            }
          });
          var gsel = first('select[name*="gender" i], select[id*="gender" i], select[name*="sex" i]');
          if(gsel){
            var opt = Array.prototype.slice.call(gsel.options||[]).find(function(o){ return (o.text||'').toLowerCase().indexOf(g.split(' ')[0])>-1; });
            if(opt){ gsel.value = opt.value; gsel.dispatchEvent(new Event('change',{bubbles:true})); done=true; }
          }
          if(done) F.gender=true;
        }
      }

      // Throttle so we never hammer a re-rendering page (min 700ms between runs).
      var lastRun = 0;
      function run(){ var t=Date.now(); if(t-lastRun<700) return; lastRun=t; tick(); }
      if (window.__gwObs) { try { window.__gwObs.disconnect(); } catch(e){} }
      if (window.__gwInt) clearInterval(window.__gwInt);
      // Watch only node additions (not attribute churn) to catch fields revealed
      // on later sign-up steps, then stop after ~10s.
      window.__gwObs = new MutationObserver(run);
      window.__gwObs.observe(document.body || document.documentElement, { childList:true, subtree:true });
      var __n = 0;
      window.__gwInt = setInterval(function(){ __n++; run(); if (__n > 12) { clearInterval(window.__gwInt); try { window.__gwObs.disconnect(); } catch(e){} } }, 800);
      tick(); lastRun = Date.now();
    } catch(e){}
  })();`
}

/** Hunchly-style: highlight selector terms on the page and return the hit count.
 *  `on=false` (or no selectors) clears any existing highlights and returns 0. */
function highlightScript(selectors: string[], on: boolean): string {
  const data = JSON.stringify(on ? selectors : [])
  return `(function(){try{
    var SEL=${data};
    var prev=document.querySelectorAll('mark[data-gwhl]');
    for(var i=0;i<prev.length;i++){var pm=prev[i];if(pm.parentNode){pm.parentNode.replaceChild(document.createTextNode(pm.textContent),pm);}}
    if(!SEL.length||!document.body) return 0;
    var sl=SEL.map(function(s){return String(s).toLowerCase()}).filter(Boolean);
    var count=0, w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null), todo=[], n;
    while(n=w.nextNode()){var p=n.parentNode;if(!p)continue;var tn=p.nodeName;if(tn==='SCRIPT'||tn==='STYLE'||tn==='TEXTAREA'||tn==='NOSCRIPT')continue;var lv=n.nodeValue.toLowerCase();for(var j=0;j<sl.length;j++){if(lv.indexOf(sl[j])>=0){todo.push(n);break;}}}
    for(var k=0;k<todo.length;k++){
      var node=todo[k],s=node.nodeValue,low=s.toLowerCase(),frag=document.createDocumentFragment(),pos=0;
      while(pos<s.length){
        var best=-1,bestLen=0;
        for(var j2=0;j2<sl.length;j2++){var idx=low.indexOf(sl[j2],pos);if(idx>=0&&(best<0||idx<best)){best=idx;bestLen=sl[j2].length;}}
        if(best<0){frag.appendChild(document.createTextNode(s.slice(pos)));break;}
        if(best>pos)frag.appendChild(document.createTextNode(s.slice(pos,best)));
        var mk=document.createElement('mark');mk.setAttribute('data-gwhl','1');mk.style.cssText='background:#fde047;color:#111;border-radius:2px;padding:0 1px';mk.textContent=s.slice(best,best+bestLen);frag.appendChild(mk);count++;pos=best+bestLen;
      }
      if(node.parentNode)node.parentNode.replaceChild(frag,node);
    }
    return count;
  }catch(e){return 0}})();`
}

let tabSeq = 0
const newId = (): string => `tab_${Date.now()}_${tabSeq++}`

export function Browser(): JSX.Element {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [vpnConfigs, setVpnConfigs] = useState<VpnConfigStatus[]>([])
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [address, setAddress] = useState('')
  const addressRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState('')
  const [pasteImg, setPasteImg] = useState<PasteImage | null>(getPasteImage())
  const [copied, setCopied] = useState(false)
  const [pastePos, setPastePos] = useState<{ top: number; left: number } | null>(null)
  const pasteDragRef = useRef<{ mx: number; my: number; bx: number; by: number } | null>(null)
  const pasteBoxRef = useRef<HTMLDivElement | null>(null)
  // Post-capture annotation panel: a screenshot is always filed first (id), then
  // the user can add a caption + notes before it disappears.
  const [annotate, setAnnotate] = useState<{ id: string; title: string; note: string; thumb: string } | null>(null)
  const [savingNote, setSavingNote] = useState(false)
  const refs = useRef<Map<string, WebviewEl>>(new Map())
  const { settings, update, loaded } = useSettings()
  const restored = useRef(false)
  const [sessionReady, setSessionReady] = useState(false)
  // Per-investigation tab storage. Refs give switch/persist effects the latest
  // state without becoming deps (avoids infinite loops).
  const prevProjectId = useRef<string | null>(null)
  const tabsRef = useRef<Tab[]>([])
  const activeIdRef = useRef<string>('')
  const byProjectRef = useRef<Record<string, { tabs: { url: string; personaId?: string }[]; activeIndex: number }>>({})

  useEffect(() => { tabsRef.current = tabs }, [tabs])
  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  const selKey = settings.activeProjectId ?? '_global'
  const selectors = settings.selectorsByProject?.[selKey] ?? []
  const highlightOn = settings.highlightSelectors !== false
  // Long-press + button to pick a persona for the new tab.
  const [personaPicker, setPersonaPicker] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pickerWrapRef = useRef<HTMLDivElement | null>(null)
  const [selOpen, setSelOpen] = useState(false)
  const [newSel, setNewSel] = useState('')
  const [pulling, setPulling] = useState(false)

  const setSelectors = (list: string[]): void => {
    update({ selectorsByProject: { ...(settings.selectorsByProject ?? {}), [selKey]: list } })
  }
  const addSelector = (term: string): void => {
    const t = term.trim()
    if (!t || selectors.some((s) => s.toLowerCase() === t.toLowerCase())) return
    setSelectors([...selectors, t])
    setNewSel('')
  }
  const removeSelector = (term: string): void => setSelectors(selectors.filter((s) => s !== term))

  // Seed selectors from the active investigation's known information: data points
  // + every entity label on its link charts.
  const pullFromCase = async (): Promise<void> => {
    if (!settings.activeProjectId) return
    setPulling(true)
    try {
      const terms = new Set(selectors)
      const proj = await api.projects.get(settings.activeProjectId)
      for (const dp of proj?.dataPoints ?? []) if (dp.value?.trim()) terms.add(dp.value.trim())
      if (proj?.subject?.trim()) terms.add(proj.subject.trim())
      const boards = (await api.boards.list()).filter((b) => b.projectId === settings.activeProjectId)
      for (const b of boards) {
        const g = await api.boards.graph(b.id)
        const skip = new Set<string>(['location', 'custom', 'image', 'document'])
        for (const n of g.nodes) if (n.label?.trim() && !skip.has(n.type)) terms.add(n.label.trim())
      }
      setSelectors([...terms])
    } finally {
      setPulling(false)
    }
  }

  // Re-highlight the active tab whenever the selector set / toggle changes.
  // executeJavaScript throws *synchronously* if the webview isn't dom-ready yet
  // (e.g. a tab that was just opened), so it must be wrapped — an unhandled sync
  // throw here escapes the effect and crashes the page to a black screen.
  useEffect(() => {
    const wv = refs.current.get(activeId)
    if (!wv) return
    try {
      const r = wv.executeJavaScript(highlightScript(selectors, highlightOn)) as Promise<number> | undefined
      if (r && typeof r.then === 'function') r.then((c) => updateTab(activeId, { hits: c })).catch(() => {})
    } catch {
      /* webview not dom-ready yet — the did-finish-load handler will re-run it */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.selectorsByProject, settings.activeProjectId, highlightOn, activeId])

  const savePage = async (): Promise<void> => {
    if (!active) return
    const wv = refs.current.get(active.id)
    if (!wv) return
    try {
      const img = await wv.capturePage()
      const dataUrl = img.toDataURL()
      const ev = await api.evidence.capture({
        dataUrl,
        sourceUrl: active.url,
        title: active.title,
        projectId: settings.activeProjectId ?? null,
        kind: 'screenshot'
      })
      const hitSel = selectors.length ? `Selectors hit: ${active.hits ?? 0}.` : ''
      setAnnotate({ id: ev.id, title: ev.title ?? active.title ?? '', note: hitSel, thumb: dataUrl })
    } catch {
      setToast('Could not capture this page')
      setTimeout(() => setToast(''), 2600)
    }
  }

  // Forensic capture: the full scrollable page screenshot + a complete MHTML
  // page archive + a hashed manifest (URL, time, UA, SHA-256s), filed as one
  // exhibit. The defensible, court-style web capture.
  const [fullBusy, setFullBusy] = useState(false)
  const captureFullPage = async (): Promise<void> => {
    if (!active) return
    const wv = refs.current.get(active.id)
    if (!wv) return
    setFullBusy(true)
    try {
      const r = await api.evidence.forensicCapture({
        webContentsId: wv.getWebContentsId(),
        sourceUrl: active.url,
        title: active.title,
        projectId: settings.activeProjectId ?? null
      })
      if (!r.ok || !r.evidence) {
        setToast(r.error || 'Forensic capture failed')
        setTimeout(() => setToast(''), 3000)
        return
      }
      const arch = r.evidence.artifacts?.find((a) => a.kind === 'multipart/related')
      const note =
        `Forensic capture of ${active.url} at ${new Date().toISOString()}.\n` +
        `Screenshot SHA-256: ${r.evidence.sha256}` +
        (arch ? `\nMHTML archive SHA-256: ${arch.sha256}` : '')
      setAnnotate({ id: r.evidence.id, title: r.evidence.title ?? active.title ?? '', note, thumb: r.thumb ?? '' })
    } finally {
      setFullBusy(false)
    }
  }

  const saveAnnotate = async (): Promise<void> => {
    if (!annotate) return
    setSavingNote(true)
    try {
      await api.evidence.setTitle(annotate.id, annotate.title.trim())
      await api.evidence.setNote(annotate.id, annotate.note.trim())
    } finally {
      setSavingNote(false)
      setAnnotate(null)
      setToast(settings.activeProjectId ? 'Saved to the active investigation' : 'Saved to Evidence')
      setTimeout(() => setToast(''), 2400)
    }
  }

  useEffect(() => subscribePasteImage(setPasteImg), [])

  // Let the Cross-Reference tool read the links off whatever results page is open.
  useEffect(() => {
    return registerTabReader(async () => {
      const wv = refs.current.get(activeId)
      if (!wv) return null
      try {
        const json = (await wv.executeJavaScript(
          'JSON.stringify({url:location.href,title:document.title,links:Array.prototype.slice.call(document.querySelectorAll("a[href]")).map(function(a){return a.href}).filter(function(h){return /^https?:/.test(h)}).slice(0,800)})'
        )) as string
        return JSON.parse(json)
      } catch {
        return null
      }
    })
  }, [activeId])

  // Expose the active tab's HTML (capped) for the Facebook ID tool.
  useEffect(() => {
    return registerHtmlReader(async () => {
      const wv = refs.current.get(activeId)
      if (!wv) return null
      try {
        const json = (await wv.executeJavaScript(
          'JSON.stringify({url:location.href,html:document.documentElement.outerHTML.slice(0,1500000)})'
        )) as string
        return JSON.parse(json)
      } catch {
        return null
      }
    })
  }, [activeId])
  useEffect(() => { setPastePos(null) }, [pasteImg])

  const copyPaste = async (): Promise<void> => {
    if (!pasteImg) return
    await api.clipboard.writeImage(pasteImg.dataUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1300)
  }

  const active = tabs.find((t) => t.id === activeId) ?? null
  const [regionMode, setRegionMode] = useState(false)
  const [sel, setSel] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const selRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)


  const capture = async (rect?: { x: number; y: number; width: number; height: number }): Promise<void> => {
    if (!active) return
    const wv = refs.current.get(active.id)
    if (!wv) return
    try {
      const img = await wv.capturePage(rect)
      const dataUrl = img.toDataURL()
      const title = active.title + (rect ? ' (region)' : '')
      const ev = await api.evidence.capture({
        dataUrl,
        sourceUrl: active.url,
        title,
        projectId: settings.activeProjectId ?? null
      })
      setAnnotate({ id: ev.id, title: ev.title ?? title, note: '', thumb: dataUrl })
    } catch {
      setToast('Capture failed')
      setTimeout(() => setToast(''), 2200)
    }
  }

  // Region-select capture: drag a box over the page; capture just that rect.
  useEffect(() => {
    if (!regionMode) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setRegionMode(false)
        setSel(null)
        dragStart.current = null
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [regionMode])

  // Close the persona picker when clicking anywhere outside its wrapper.
  useEffect(() => {
    if (!personaPicker) return
    const handler = (e: MouseEvent): void => {
      if (!pickerWrapRef.current?.contains(e.target as Node)) setPersonaPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [personaPicker])

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
        const created: Tab[] = req.tabs.map((t) => {
          const url = toUrl(t.url)
          const blank = url === NEWTAB
          return {
            id: newId(),
            url,
            initialUrl: url,
            title: blank ? 'New tab' : 'Loading…',
            loading: !blank,
            failed: false,
            personaId: t.personaId,
            autofill: t.autofill
          }
        })
        if (created.length) setActiveId(created[0].id)
        return [...prev, ...created]
      })
    },
    []
  )

  // Restore the previous session's tabs once settings have loaded, then deliver
  // any queued open-request on top (an explicit pivot/open wins the active tab).
  useEffect(() => {
    if (!loaded || restored.current) return
    restored.current = true
    // Seed the in-memory by-project cache from persisted settings.
    byProjectRef.current = settings.browserTabsByProject ?? {}
    const projectId = settings.activeProjectId ?? null
    prevProjectId.current = projectId
    // Per-project tabs take priority; fall back to legacy global tabs for upgrades.
    const byProject = projectId ? byProjectRef.current[projectId] : undefined
    const saved = byProject?.tabs ?? settings.browserTabs ?? []
    const savedIndex = byProject?.activeIndex ?? settings.browserActiveIndex ?? 0
    if (saved.length) {
      const created: Tab[] = saved.map((t) => ({
        id: newId(),
        url: toUrl(t.url),
        initialUrl: toUrl(t.url),
        title: 'Loading…',
        loading: true,
        failed: false,
        personaId: t.personaId
      }))
      setTabs(created)
      const idx = Math.min(Math.max(savedIndex, 0), created.length - 1)
      setActiveId(created[idx].id)
    }
    const pending = consumePending()
    if (pending) openTabs(pending)
    // Flips in the same render batch as the setTabs above, so the persist effect
    // below won't fire (and overwrite the saved session) until tabs reflect it.
    setSessionReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  // When the user switches investigations, save the current tabs under the old
  // project and restore (or start fresh) for the new one.
  useEffect(() => {
    if (!sessionReady) return
    const newProjectId = settings.activeProjectId ?? null
    if (newProjectId === prevProjectId.current) return
    const oldId = prevProjectId.current
    prevProjectId.current = newProjectId
    // Save current tabs under the old investigation.
    if (oldId) {
      const snapshot = tabsRef.current.map((t) => ({ url: t.url, personaId: t.personaId }))
      const activeIndex = Math.max(0, tabsRef.current.findIndex((t) => t.id === activeIdRef.current))
      byProjectRef.current = { ...byProjectRef.current, [oldId]: { tabs: snapshot, activeIndex } }
      update({ browserTabsByProject: byProjectRef.current })
    }
    // Restore the new investigation's tabs (or start with an empty browser).
    const newData = newProjectId ? byProjectRef.current[newProjectId] : undefined
    const saved = newData?.tabs ?? []
    const savedIndex = newData?.activeIndex ?? 0
    if (saved.length) {
      const created: Tab[] = saved.map((t) => ({
        id: newId(),
        url: toUrl(t.url),
        initialUrl: toUrl(t.url),
        title: 'Loading…',
        loading: true,
        failed: false,
        personaId: t.personaId
      }))
      setTabs(created)
      setActiveId(created[Math.min(Math.max(savedIndex, 0), created.length - 1)].id)
    } else {
      setTabs([])
      setActiveId('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.activeProjectId, sessionReady])

  // Subscribe for new open-requests from elsewhere in the app.
  useEffect(() => subscribeOpen(openTabs), [openTabs])

  // Persist the open tabs (url + persona) so the session survives a restart.
  useEffect(() => {
    if (!sessionReady) return
    const projectId = settings.activeProjectId ?? null
    const snapshot = tabs.map((t) => ({ url: t.url, personaId: t.personaId }))
    const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeId))
    if (projectId) {
      byProjectRef.current = { ...byProjectRef.current, [projectId]: { tabs: snapshot, activeIndex } }
      update({ browserTabsByProject: byProjectRef.current, browserTabs: snapshot, browserActiveIndex: activeIndex })
    } else {
      update({ browserTabs: snapshot, browserActiveIndex: activeIndex })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, activeId, sessionReady])

  useEffect(() => {
    if (active) setAddress(active.url === NEWTAB ? '' : active.url)
  }, [activeId, active?.url]) // eslint-disable-line react-hooks/exhaustive-deps

  // Open a fresh blank tab and drop the cursor in the address bar, like a normal
  // browser. Blank tabs load nothing, so the webview can't steal focus back.
  const newTab = (): void => {
    openTabs({ tabs: [{ url: NEWTAB }] })
    requestAnimationFrame(() => {
      addressRef.current?.focus()
      addressRef.current?.select()
    })
  }

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
        <div ref={pickerWrapRef} className="relative ml-1 mb-1 shrink-0">
          <button
            className="p-1.5 rounded-lg text-slate-400 hover:bg-ink-800"
            title="New tab — hold for persona"
            onMouseDown={() => {
              longPressTimer.current = setTimeout(() => {
                longPressTimer.current = null
                setPersonaPicker(true)
              }, 450)
            }}
            onMouseUp={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current)
                longPressTimer.current = null
                newTab()
              }
            }}
            onMouseLeave={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current)
                longPressTimer.current = null
              }
            }}
          >
            <Plus size={16} />
          </button>
          {personaPicker && (
            <div className="absolute bottom-full right-0 mb-1 z-50 w-56 card p-1 shadow-2xl border-ink-600">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 px-2 py-1 border-b border-ink-700 mb-1">
                Open tab as persona
              </div>
              {personas.filter((p) => p.status === 'active').length === 0 && (
                <div className="text-xs text-slate-500 px-2 py-2">No active personas</div>
              )}
              {personas
                .filter((p) => p.status === 'active')
                .map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-ink-800 flex items-center gap-2"
                    onClick={() => {
                      openTabs({ tabs: [{ url: NEWTAB, personaId: p.id }] })
                      setPersonaPicker(false)
                    }}
                  >
                    <Fingerprint size={13} style={{ color: personaColor(p.id) }} className="shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
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
            ref={addressRef}
            className="input pl-8 pr-3 bg-ink-850 font-mono text-xs"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="Search Google or enter address"
            spellCheck={false}
            disabled={!active}
          />
        </form>

        {active?.autofill && (
          <button
            className="btn-ghost !px-2 text-accent"
            title="Re-fill persona details into the current form"
            onClick={() =>
              active &&
              refs.current
                .get(active.id)
                ?.executeJavaScript('try{window.__gwFilled={}}catch(e){};' + fillScript(active.autofill!))
                .catch(() => {})
            }
          >
            <KeyRound size={16} />
          </button>
        )}

        <button
          className="btn-ghost !px-2 text-accent"
          title="Capture a region as evidence — drag a box (or use Full visible)"
          onClick={() => {
            setSel(null)
            selRef.current = null
            setRegionMode(true)
          }}
          disabled={!active}
        >
          <Camera size={17} />
        </button>

        {/* Selectors (Hunchly-style highlighting) */}
        <div className="relative">
          <button
            className="btn-ghost !px-2 relative"
            title="Selectors — highlight terms of interest on every page"
            onClick={() => setSelOpen((v) => !v)}
            disabled={!active}
          >
            <Highlighter size={17} className={highlightOn && selectors.length ? 'text-yellow-300' : ''} />
            {(active?.hits ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[9px] font-bold rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center">
                {active!.hits}
              </span>
            )}
          </button>
          {selOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSelOpen(false)} />
              <div className="absolute right-0 mt-1 z-40 w-72 card p-3 shadow-2xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-200">Selectors</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input type="checkbox" className="accent-accent" checked={highlightOn} onChange={(e) => update({ highlightSelectors: e.target.checked })} /> Highlight
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  {settings.activeProjectId ? 'Scoped to this investigation.' : 'No active investigation — these apply globally.'}
                </p>
                {settings.activeProjectId && (
                  <button
                    className="btn-ghost border border-ink-600 text-xs w-full mb-2 disabled:opacity-50"
                    onClick={pullFromCase}
                    disabled={pulling}
                  >
                    {pulling ? 'Pulling…' : 'Pull known info from case'}
                  </button>
                )}
                <div className="flex gap-1.5 mb-2">
                  <input
                    className="input !py-1 text-xs"
                    placeholder="Add a term…"
                    value={newSel}
                    onChange={(e) => setNewSel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSelector(newSel)}
                  />
                  <button className="btn-ghost border border-ink-600 text-xs" onClick={() => addSelector(newSel)}>Add</button>
                </div>
                {selectors.length === 0 ? (
                  <p className="text-xs text-slate-500">Add names, emails, usernames… they’ll be highlighted on every page you visit.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {selectors.map((s) => (
                      <span key={s} className="chip text-[11px] flex items-center gap-1">
                        {s}
                        <button onClick={() => removeSelector(s)} className="hover:text-warn">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Save the current page (visible viewport) to the investigation */}
        <button className="btn-ghost !px-2 text-accent" title="Save this page to the investigation (screenshot + URL)" onClick={savePage} disabled={!active}>
          <BookmarkPlus size={17} />
        </button>

        {/* Forensic full-page capture */}
        <button
          className="btn-ghost !px-2 text-accent disabled:opacity-40"
          title="Forensic capture: full scrollable page → evidence"
          onClick={captureFullPage}
          disabled={!active || fullBusy}
        >
          {fullBusy ? <Loader2 size={17} className="animate-spin" /> : <ScrollText size={17} />}
        </button>

        {/* Toggle the OSINT bookmarks panel */}
        <button
          className={`btn-ghost !px-2 ${settings.showBookmarks ? 'text-brand-glow' : ''}`}
          title="OSINT bookmarks"
          onClick={() => update({ showBookmarks: !settings.showBookmarks })}
        >
          <Library size={17} />
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

      {/* Content row: optional OSINT bookmarks panel + the webviews */}
      <div className="flex-1 min-h-0 flex">
      {settings.showBookmarks && (
        <BookmarksPanel onOpen={(url) => openTabs({ tabs: [{ url }] })} onClose={() => update({ showBookmarks: false })} />
      )}
      {/* Webviews — all mounted; only active visible so background tabs keep loading */}
      <div className="flex-1 min-h-0 relative bg-white">
        {tabs.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950 text-slate-500 gap-3">
            <Globe size={32} className="text-slate-600" />
            <div>No tabs open.</div>
            <button className="btn-primary" onClick={newTab}>
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
            selectors={selectors}
            highlightOn={highlightOn}
          />
        ))}

        {/* Region-capture overlay */}
        {regionMode && active && (
          <div
            className="absolute inset-0 z-40 cursor-crosshair"
            style={{ background: 'rgba(2,6,15,0.35)' }}
            onMouseDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              dragStart.current = { x: e.clientX - r.left, y: e.clientY - r.top }
              const s = { ...dragStart.current, w: 0, h: 0 }
              selRef.current = s
              setSel(s)
            }}
            onMouseMove={(e) => {
              if (!dragStart.current) return
              const r = e.currentTarget.getBoundingClientRect()
              const cx = e.clientX - r.left
              const cy = e.clientY - r.top
              const s = {
                x: Math.min(cx, dragStart.current.x),
                y: Math.min(cy, dragStart.current.y),
                w: Math.abs(cx - dragStart.current.x),
                h: Math.abs(cy - dragStart.current.y)
              }
              selRef.current = s
              setSel(s)
            }}
            onMouseUp={async () => {
              dragStart.current = null
              const s = selRef.current
              setRegionMode(false)
              setSel(null)
              selRef.current = null
              if (s && s.w > 4 && s.h > 4) {
                await capture({ x: s.x, y: s.y, width: s.w, height: s.h })
              }
            }}
          >
            {sel && (
              <div
                className="absolute border-2 border-accent pointer-events-none"
                style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h, background: 'rgba(34,211,238,0.12)' }}
              />
            )}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-ink-900/95 border border-ink-600 rounded-lg px-3 py-1.5 text-xs text-slate-200 shadow-xl">
              <span>Drag to select a region</span>
              <button
                className="btn-ghost border border-ink-600 !py-1 text-xs"
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setRegionMode(false)
                  setSel(null)
                  dragStart.current = null
                  capture()
                }}
              >
                Full visible
              </button>
              <button
                className="btn-ghost !py-1 text-xs"
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setRegionMode(false)
                  setSel(null)
                  dragStart.current = null
                }}
              >
                Cancel (Esc)
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {toast && (
        <div className="absolute bottom-5 right-5 z-50 card px-4 py-2.5 text-sm text-slate-200 border-accent/40 shadow-xl">
          {toast}
        </div>
      )}

      {/* Annotate a just-captured screenshot (caption + notes). Already filed —
          this only enriches it, so closing keeps the evidence. */}
      {annotate && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onMouseDown={() => setAnnotate(null)}>
          <div className="card w-[460px] max-w-full p-4 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-200">Screenshot saved — add notes</span>
              <button className="btn-ghost !p-1" onClick={() => setAnnotate(null)} title="Close (keeps it saved)">
                <X size={15} />
              </button>
            </div>
            <img src={annotate.thumb} alt="" className="w-full max-h-44 object-contain rounded-md border border-ink-700 bg-ink-950 mb-3" />
            <label className="block text-[11px] text-slate-400 mb-1">Caption</label>
            <input
              className="input text-sm mb-3"
              value={annotate.title}
              placeholder="Short caption…"
              onChange={(e) => setAnnotate((a) => (a ? { ...a, title: e.target.value } : a))}
            />
            <label className="block text-[11px] text-slate-400 mb-1">Notes</label>
            <textarea
              className="input text-sm h-24 resize-none"
              value={annotate.note}
              placeholder="What does this show? Why does it matter?"
              autoFocus
              onChange={(e) => setAnnotate((a) => (a ? { ...a, note: e.target.value } : a))}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button className="btn-ghost border border-ink-600 text-sm" onClick={() => setAnnotate(null)}>
                Skip
              </button>
              <button className="btn-primary text-sm disabled:opacity-50" onClick={saveAnnotate} disabled={savingNote}>
                {savingNote ? 'Saving…' : 'Save notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reverse-image paste helper — the staged image, ready to drop into the engine. Draggable by the title bar. */}
      {pasteImg && (
        <div
          ref={pasteBoxRef}
          className="fixed z-50 w-44 card p-2.5 shadow-2xl border-accent/30 select-none"
          style={pastePos ? { top: pastePos.top, left: pastePos.left } : { top: 16, right: 16 }}
        >
          <div
            className="flex items-center justify-between mb-1.5 cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
              e.preventDefault()
              const box = pasteBoxRef.current
              if (!box) return
              const br = box.getBoundingClientRect()
              pasteDragRef.current = { mx: e.clientX, my: e.clientY, bx: br.left, by: br.top }
              const onMove = (ev: MouseEvent): void => {
                if (!pasteDragRef.current) return
                setPastePos({
                  left: Math.max(0, pasteDragRef.current.bx + ev.clientX - pasteDragRef.current.mx),
                  top: Math.max(0, pasteDragRef.current.by + ev.clientY - pasteDragRef.current.my)
                })
              }
              const onUp = (): void => {
                pasteDragRef.current = null
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
              }
              window.addEventListener('mousemove', onMove)
              window.addEventListener('mouseup', onUp)
            }}
          >
            <span className="text-[11px] font-semibold text-slate-200">Image to paste</span>
            <button className="btn-ghost !p-1" onClick={() => { setPasteImage(null); setPastePos(null) }} title="Dismiss">
              <X size={13} />
            </button>
          </div>
          <img src={pasteImg.dataUrl} alt="" className="w-full h-24 object-cover rounded-md border border-ink-700 mb-2" />
          <button className="btn-primary w-full justify-center text-xs !py-1.5" onClick={copyPaste}>
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied!' : 'Copy image'}
          </button>
          <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
            Click the engine's upload box, then press <b>Ctrl+V</b>.
          </p>
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
  selectors,
  highlightOn
}: {
  tab: Tab
  active: boolean
  personas: Persona[]
  registerRef: (el: WebviewEl | null) => void
  onState: (patch: Partial<Tab>) => void
  selectors: string[]
  highlightOn: boolean
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
    const inject = (script: string): void => {
      try {
        const r = wv.executeJavaScript(script) as Promise<unknown> | undefined
        if (r && typeof r.catch === 'function') r.catch(() => {})
      } catch {
        /* not dom-ready yet — a later event retries */
      }
    }
    const onFinish = (): void => {
      // Idempotent autofill (only fills empty fields).
      if (tab.autofill) inject(fillScript(tab.autofill))
      // Highlight selectors and report the hit count.
      if (highlightOn && selectors.length) {
        try {
          const r = wv.executeJavaScript(highlightScript(selectors, true)) as Promise<number> | undefined
          if (r && typeof r.then === 'function') r.then((c) => onState({ hits: c })).catch(() => {})
        } catch {
          /* retry on next event */
        }
      } else {
        onState({ hits: 0 })
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
  }, [partition, tab.autofill, highlightOn, selectors])

  return (
    <div className="absolute inset-0" style={{ display: active ? 'block' : 'none' }}>
      {tab.url === NEWTAB && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink-950 select-none pointer-events-none">
          <Globe size={28} className="text-slate-700 mb-2" />
          <div className="text-slate-600 text-sm">Type an address or search in the bar above</div>
        </div>
      )}
      {tab.failed && active && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink-950 text-center p-6">
          <AlertTriangle size={36} className="text-warn mb-3" />
          <h3 className="text-slate-200 font-semibold">This site wouldn’t load in the in-app browser</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            It may block embedding or have failed to connect (check your VPN/proxy). Try reloading the page.
          </p>
          <button
            className="btn-primary mt-4"
            onClick={() => {
              onState({ failed: false, loading: true })
              localRef.current?.reload()
            }}
          >
            <RefreshCw size={16} /> Reload page
          </button>
        </div>
      )}
      <webview
        key={partition}
        ref={attach as never}
        src={tab.initialUrl}
        partition={partition}
        allowpopups="true"
        style={{ width: '100%', height: '100%', display: 'inline-flex' }}
      />
    </div>
  )
}

/** Collapsible OSINT bookmarks tree shown beside the webview when toggled on. */
function BookmarksPanel({ onOpen, onClose }: { onOpen: (url: string) => void; onClose: () => void }): JSX.Element {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  const filter = (g: BmGroup): BmGroup | null => {
    if (!query) return g
    const links = (g.links ?? []).filter((l) => l.name.toLowerCase().includes(query) || l.url.toLowerCase().includes(query))
    const groups = (g.groups ?? []).map(filter).filter((x): x is BmGroup => !!x)
    if (links.length || groups.length || g.name.toLowerCase().includes(query)) return { ...g, links, groups }
    return null
  }
  const groups = OSINT_BOOKMARKS.map(filter).filter((x): x is BmGroup => !!x)

  return (
    <div className="w-64 shrink-0 border-r border-ink-700 bg-ink-900 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ink-700">
        <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Library size={14} /> OSINT bookmarks
        </span>
        <button className="btn-ghost !p-1" onClick={onClose} title="Hide bookmarks">
          <X size={14} />
        </button>
      </div>
      <div className="p-2 border-b border-ink-700">
        <input className="input !py-1 text-xs" placeholder="Filter bookmarks…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex-1 overflow-y-auto py-1.5">
        {groups.map((g) => (
          <BmNode key={g.name} group={g} depth={0} onOpen={onOpen} forceOpen={!!query} />
        ))}
        {groups.length === 0 && <p className="text-xs text-slate-500 px-3 py-2">No matches.</p>}
      </div>
    </div>
  )
}

function BmNode({
  group,
  depth,
  onOpen,
  forceOpen
}: {
  group: BmGroup
  depth: number
  onOpen: (url: string) => void
  forceOpen: boolean
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const isOpen = forceOpen || open
  return (
    <div>
      <button
        className="w-full flex items-center gap-1 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-400 hover:text-slate-200"
        style={{ paddingLeft: depth * 10 + 8 }}
        onClick={() => setOpen((o) => !o)}
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="truncate">{group.name}</span>
      </button>
      {isOpen && (
        <div>
          {(group.groups ?? []).map((sg) => (
            <BmNode key={sg.name} group={sg} depth={depth + 1} onOpen={onOpen} forceOpen={forceOpen} />
          ))}
          {(group.links ?? []).map((l) => (
            <button
              key={l.url + l.name}
              className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-ink-800 hover:text-brand-glow rounded truncate"
              style={{ paddingLeft: (depth + 1) * 10 + 14 }}
              title={l.url}
              onClick={() => onOpen(l.url)}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
