import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Wifi, Loader2, Search, MapPin, Copy, Check, ExternalLink, Workflow } from 'lucide-react'
import { api, type WigleNetwork } from '../lib/api'
import { useSettings } from '../lib/settings'
import { useOpenInBrowser } from '../lib/browserBus'
import { addToInvestigation } from '../lib/investigation'

const esc = (s: string): string => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
type Kind = 'ssid' | 'bssid'

export function Wireless(): JSX.Element {
  const { settings } = useSettings()
  const openInBrowser = useOpenInBrowser()
  const [kind, setKind] = useState<Kind>('ssid')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<WigleNetwork[]>([])
  const [total, setTotal] = useState(0)
  const [copied, setCopied] = useState('')

  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const hasKey = !!settings.apiKeys?.wigle

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const m = L.map(mapEl.current, { zoomControl: true, attributionControl: false }).setView([20, 0], 2)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m)
    layerRef.current = L.layerGroup().addTo(m)
    mapRef.current = m
    setTimeout(() => m.invalidateSize(), 80)
    return () => {
      m.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const layer = layerRef.current
    const map = mapRef.current
    if (!layer || !map) return
    layer.clearLayers()
    const bounds: [number, number][] = []
    for (const n of results) {
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:13px;height:13px;border-radius:50%;background:#a78bfa;border:2px solid #0a0c10;box-shadow:0 0 6px #a78bfa"></div>',
        iconSize: [13, 13],
        iconAnchor: [6, 6]
      })
      L.marker([n.lat, n.lng], { icon })
        .addTo(layer)
        .bindPopup(`<b>${esc(n.ssid || '(hidden SSID)')}</b><br><span style="font-family:monospace">${esc(n.bssid)}</span><br><span style="opacity:.7">${esc(n.encryption)} · ${esc(n.place)}</span>`)
      bounds.push([n.lat, n.lng])
    }
    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [results])

  const run = async (): Promise<void> => {
    if (!input.trim()) return
    if (!hasKey) {
      setError('Add a WiGLE API token in Settings → API keys.')
      return
    }
    setError('')
    setResults([])
    setLoading(true)
    try {
      const r = await api.intel.wigle(input.trim(), kind, settings.apiKeys!.wigle!)
      if (!r.ok) {
        setError(r.error || 'Search failed.')
        return
      }
      setResults(r.results ?? [])
      setTotal(r.total ?? r.results?.length ?? 0)
      if ((r.results ?? []).length === 0) setError('No located networks for that query.')
    } finally {
      setLoading(false)
    }
  }

  const copy = (val: string): void => {
    api.clipboard.writeText(val)
    setCopied(val)
    setTimeout(() => setCopied(''), 1200)
  }

  // Add a located network to the investigation as a location entity.
  const addNet = async (n: WigleNetwork): Promise<void> => {
    await addToInvestigation({
      projectId: settings.activeProjectId ?? null,
      entities: [
        {
          type: 'location',
          label: n.ssid || n.bssid,
          props: { bssid: n.bssid, ssid: n.ssid, encryption: n.encryption, location: n.place, lat: String(n.lat), lng: String(n.lng) }
        }
      ]
    })
    setError('')
    setCopied(`added:${n.bssid}`)
    setTimeout(() => setCopied(''), 1400)
  }

  const placeholder = useMemo(() => (kind === 'ssid' ? 'Network name (SSID), e.g. CoffeeShop-WiFi' : 'BSSID / AP MAC, e.g. 00:11:22:33:44:55'), [kind])

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-ink-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Wifi size={20} className="text-brand-glow" /> Wireless (WiGLE)
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Geolocate WiFi networks from WiGLE's wardriving database — search by network name (SSID) or access-point MAC
          (BSSID). Each hit plots where it was observed.
        </p>
      </div>

      <div className="px-6 py-3 border-b border-ink-700 flex items-center gap-2">
        <div className="flex rounded-lg border border-ink-600 overflow-hidden">
          <button className={`px-3 py-1.5 text-sm ${kind === 'ssid' ? 'bg-brand/15 text-brand-glow' : 'text-slate-400 hover:bg-ink-800'}`} onClick={() => setKind('ssid')}>SSID</button>
          <button className={`px-3 py-1.5 text-sm ${kind === 'bssid' ? 'bg-brand/15 text-brand-glow' : 'text-slate-400 hover:bg-ink-800'}`} onClick={() => setKind('bssid')}>BSSID</button>
        </div>
        <input className="input flex-1" placeholder={placeholder} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />
        <button className="btn-primary" onClick={run} disabled={!input.trim() || loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Search
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-[420px] shrink-0 border-r border-ink-700 overflow-y-auto p-4 space-y-2">
          {!hasKey && <div className="card p-3 text-sm text-slate-400">Add a WiGLE API token in Settings → API keys (free account). Paste the “Encoded for use” token.</div>}
          {error && <div className="card p-3 text-sm text-warn">{error}</div>}
          {results.length > 0 && <div className="text-[11px] uppercase tracking-widest text-slate-500">{results.length} located {total > results.length ? `of ${total} ` : ''}network{results.length === 1 ? '' : 's'}</div>}
          {results.map((n, i) => (
            <div key={i} className="card p-2.5 text-sm">
              <div className="text-slate-200 font-medium truncate">{n.ssid || '(hidden SSID)'}</div>
              <div className="text-[11px] text-slate-400 font-mono">{n.bssid}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{[n.encryption, n.place].filter(Boolean).join(' · ')}</div>
              <div className="text-[11px] text-slate-600">{n.lat.toFixed(5)}, {n.lng.toFixed(5)}{n.lastSeen ? ` · seen ${n.lastSeen.slice(0, 10)}` : ''}</div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([`https://www.google.com/maps?q=${n.lat},${n.lng}`])}>
                  <MapPin size={12} /> Map
                </button>
                <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([`https://wigle.net/search?netid=${encodeURIComponent(n.bssid)}`])}>
                  <ExternalLink size={12} /> WiGLE
                </button>
                <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => copy(n.bssid)}>
                  {copied === n.bssid ? <Check size={12} className="text-ok" /> : <Copy size={12} />} BSSID
                </button>
                <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => addNet(n)} title="Add this network's location to the investigation">
                  {copied === `added:${n.bssid}` ? <Check size={12} className="text-ok" /> : <Workflow size={12} />} Case
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 min-h-0 relative">
          <div ref={mapEl} className="absolute inset-0" />
          {results.length === 0 && !loading && (
            <div className="absolute inset-0 z-[500] pointer-events-none flex items-center justify-center">
              <div className="card px-4 py-3 text-sm text-slate-400 pointer-events-auto max-w-sm text-center">
                Search a network name or BSSID — located observations plot here. BSSID search pinpoints a specific access
                point; SSID search finds all networks with that name.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
