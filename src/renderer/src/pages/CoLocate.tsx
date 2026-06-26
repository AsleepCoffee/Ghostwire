import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Crosshair, Loader2, Search, MapPin, Globe, Copy, Check } from 'lucide-react'
import { api } from '../lib/api'
import { useOpenInBrowser } from '../lib/browserBus'

const enc = encodeURIComponent
const esc = (s: string): string => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

interface Hit {
  bName: string
  bAddr: string
  bLat: number
  bLng: number
  aName: string
  aLat: number
  aLng: number
  dist: number
}

interface OverpassEl {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

// Escape regex metacharacters so a brand name is matched literally by Overpass.
const rx = (s: string): string => s.trim().replace(/[\\"]/g, '').replace(/[.*+?^${}()|[\]]/g, '\\$&')

function coords(el: OverpassEl): { lat: number; lng: number } | null {
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null
}

function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function addr(tags: Record<string, string> = {}): string {
  return [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
    tags['addr:state'],
    tags['addr:postcode']
  ]
    .filter(Boolean)
    .join(', ')
}

export function CoLocate(): JSX.Element {
  const openInBrowser = useOpenInBrowser()
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [range, setRange] = useState('150')
  const [region, setRegion] = useState('')
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [copied, setCopied] = useState('')

  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

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

  // Plot hits whenever they change.
  useEffect(() => {
    const layer = layerRef.current
    const map = mapRef.current
    if (!layer || !map) return
    layer.clearLayers()
    const bounds: [number, number][] = []
    for (const h of hits) {
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#22d3ee;border:2px solid #0a0c10;box-shadow:0 0 6px #22d3ee"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      })
      L.marker([h.bLat, h.bLng], { icon })
        .addTo(layer)
        .bindPopup(`<b>${esc(h.bName)}</b> &amp; <b>${esc(h.aName)}</b><br><span style="opacity:.7">${Math.round(h.dist)} m apart</span><br>${esc(h.bAddr || '')}`)
      bounds.push([h.bLat, h.bLng])
    }
    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
  }, [hits])

  const run = async (): Promise<void> => {
    if (!a.trim() || !b.trim() || !region.trim()) return
    setError('')
    setHits([])
    const R = Math.max(10, Math.min(5000, parseInt(range, 10) || 150))
    try {
      // 1) Geocode the region to a bounding box.
      setLoading('Locating region…')
      const geo = (await api.net.fetchJson(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${enc(region.trim())}`
      )) as { boundingbox?: [string, string, string, string]; display_name?: string }[]
      const bb = Array.isArray(geo) && geo[0]?.boundingbox
      if (!bb) {
        setError(`Couldn't find “${region}”. Try a country, state, or city name.`)
        setLoading('')
        return
      }
      const [s, n, w, e] = bb.map(parseFloat)

      // 2) Overpass: A in bbox, then B within range of an A. Output both so we can pair.
      setLoading('Searching OpenStreetMap…')
      const bbox = `${s},${w},${n},${e}`
      const q = `[out:json][timeout:90];
        (nwr["name"~"${rx(a)}",i](${bbox});)->.a;
        (nwr["name"~"${rx(b)}",i](${bbox});)->.b;
        .a out center tags 800;
        nwr.b(around.a:${R});
        out center tags 800;`
      const res = (await api.net.fetchJson(`https://overpass-api.de/api/interpreter?data=${enc(q)}`)) as {
        elements?: OverpassEl[]
      }
      const els = res.elements ?? []
      const reA = new RegExp(rx(a), 'i')
      const reB = new RegExp(rx(b), 'i')
      const aPts: { name: string; lat: number; lng: number }[] = []
      const bPts: { name: string; addr: string; lat: number; lng: number }[] = []
      for (const el of els) {
        const c = coords(el)
        const name = el.tags?.name ?? ''
        if (!c || !name) continue
        if (reA.test(name)) aPts.push({ name, lat: c.lat, lng: c.lng })
        else if (reB.test(name)) bPts.push({ name, addr: addr(el.tags), lat: c.lat, lng: c.lng })
      }
      // Pair each B with its nearest A; keep those within range.
      const out: Hit[] = []
      for (const bp of bPts) {
        let best: { a: typeof aPts[number]; d: number } | null = null
        for (const ap of aPts) {
          const d = haversine(ap.lat, ap.lng, bp.lat, bp.lng)
          if (!best || d < best.d) best = { a: ap, d }
        }
        if (best && best.d <= R) {
          out.push({ bName: bp.name, bAddr: bp.addr, bLat: bp.lat, bLng: bp.lng, aName: best.a.name, aLat: best.a.lat, aLng: best.a.lng, dist: best.d })
        }
      }
      out.sort((x, y) => x.dist - y.dist)
      setHits(out)
      if (out.length === 0) setError('No co-locations found in that region within range. Try a larger range or area.')
    } catch (err) {
      setError(`Search failed: ${String((err as Error)?.message ?? err)}. OpenStreetMap may be rate-limiting — wait a moment and retry.`)
    } finally {
      setLoading('')
    }
  }

  const copy = (h: Hit): void => {
    api.clipboard.writeText(`${h.bLat.toFixed(6)}, ${h.bLng.toFixed(6)}`)
    setCopied(`${h.bLat},${h.bLng}`)
    setTimeout(() => setCopied(''), 1200)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-ink-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Crosshair size={20} className="text-brand-glow" /> Proximity Search
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Find every place where two things sit close together — e.g. a Westin within 150 m of a Wendy's — across a
          country, state, or city. Powered by OpenStreetMap.
        </p>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-[420px] shrink-0 border-r border-ink-700 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="label">Thing A</label>
            <input className="input" placeholder="e.g. Westin" value={a} onChange={(e) => setA(e.target.value)} />
          </div>
          <div>
            <label className="label">Thing B (near A)</label>
            <input className="input" placeholder="e.g. Wendy's" value={b} onChange={(e) => setB(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Within (metres)</label>
              <input className="input" type="number" value={range} onChange={(e) => setRange(e.target.value)} />
            </div>
            <div className="flex-[2]">
              <label className="label">Region</label>
              <input
                className="input"
                placeholder="Country, state, or city"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && run()}
              />
            </div>
          </div>
          <button className="btn-primary w-full justify-center" onClick={run} disabled={!!loading || !a || !b || !region}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading || 'Search'}
          </button>
          {error && <div className="text-xs text-warn">{error}</div>}

          {hits.length > 0 && (
            <div className="pt-1">
              <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1.5">{hits.length} co-location{hits.length === 1 ? '' : 's'}</div>
              <div className="space-y-2">
                {hits.map((h, i) => (
                  <div key={i} className="card p-2.5 text-sm">
                    <div className="text-slate-200 font-medium">{h.bName} <span className="text-slate-500 font-normal">↔ {h.aName}</span></div>
                    <div className="text-[11px] text-accent-glow">{Math.round(h.dist)} m apart</div>
                    {h.bAddr && <div className="text-[11px] text-slate-500 mt-0.5">{h.bAddr}</div>}
                    <div className="text-[11px] text-slate-600 mt-0.5">{h.bLat.toFixed(5)}, {h.bLng.toFixed(5)}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${h.bLat},${h.bLng}`])}>
                        <Globe size={12} /> Street View
                      </button>
                      <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([`https://www.google.com/maps/search/?api=1&query=${h.bLat},${h.bLng}`])}>
                        <MapPin size={12} /> Map
                      </button>
                      <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => copy(h)}>
                        {copied === `${h.bLat},${h.bLng}` ? <Check size={12} className="text-ok" /> : <Copy size={12} />} Coords
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 relative">
          <div ref={mapEl} className="absolute inset-0" />
          {hits.length === 0 && !loading && (
            <div className="absolute inset-0 z-[500] pointer-events-none flex items-center justify-center">
              <div className="card px-4 py-3 text-sm text-slate-400 pointer-events-auto max-w-sm text-center">
                Enter two things and a region, then search. Matches plot here — each pin is a spot where both sit within
                your chosen range.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
