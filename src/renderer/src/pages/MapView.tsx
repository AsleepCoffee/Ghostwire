import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Map as MapIcon, Loader2, RefreshCw } from 'lucide-react'
import { api, type Project } from '../lib/api'
import { useSettings } from '../lib/settings'

interface Pt {
  lat: number
  lng: number
  label: string
  kind: string
}

const COLORS: Record<string, string> = {
  location: '#4ade80',
  evidence: '#22d3ee',
  ip: '#fbbf24',
  person: '#60a5fa',
  organization: '#fb923c'
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
const esc = (s: string): string => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

const geocache = new Map<string, { lat: number; lng: number } | null>()
async function geocode(q: string): Promise<{ lat: number; lng: number } | null> {
  const key = q.trim().toLowerCase()
  if (geocache.has(key)) return geocache.get(key)!
  try {
    const r = (await api.net.fetchJson(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
    )) as { lat: string; lon: string }[]
    const hit = Array.isArray(r) && r[0] ? { lat: parseFloat(r[0].lat), lng: parseFloat(r[0].lon) } : null
    geocache.set(key, hit)
    return hit
  } catch {
    geocache.set(key, null)
    return null
  }
}

export function MapView(): JSX.Element {
  const { settings } = useSettings()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string | null>(settings.activeProjectId ?? null)
  const [pts, setPts] = useState<Pt[]>([])
  const [loading, setLoading] = useState(false)
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    api.projects.list().then(setProjects)
  }, [])

  // Init the Leaflet map once.
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const m = L.map(mapEl.current, { zoomControl: true, attributionControl: false, worldCopyJump: true }).setView([20, 0], 2)
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

  const collect = async (): Promise<void> => {
    setLoading(true)
    const out: Pt[] = []
    try {
      const boards = (await api.boards.list()).filter((b) => (projectId ? b.projectId === projectId : true))
      const locs: { label: string; props: Record<string, string> }[] = []
      for (const b of boards) {
        const g = await api.boards.graph(b.id)
        for (const n of g.nodes) if (n.type === 'location') locs.push({ label: n.label, props: n.props ?? {} })
      }
      for (const e of locs) {
        const lat = parseFloat(e.props.lat)
        const lng = parseFloat(e.props.lng)
        if (isFinite(lat) && isFinite(lng)) {
          out.push({ lat, lng, label: e.label, kind: 'location' })
        } else if (e.label.trim()) {
          const g = await geocode(e.label)
          if (g) out.push({ ...g, label: e.label, kind: 'location' })
          await sleep(1100) // be polite to Nominatim
        }
      }
      const ev = (await api.evidence.list(projectId)).filter((x) => x.kind !== 'file')
      for (const item of ev) {
        const ex = await api.files.exif(item.path)
        if (ex.gps) out.push({ lat: ex.gps.lat, lng: ex.gps.lng, label: item.title || 'Evidence', kind: 'evidence' })
      }
    } finally {
      setPts(out)
      setLoading(false)
    }
  }

  useEffect(() => {
    collect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Render markers when points change.
  useEffect(() => {
    const layer = layerRef.current
    const map = mapRef.current
    if (!layer || !map) return
    layer.clearLayers()
    const bounds: [number, number][] = []
    for (const p of pts) {
      const c = COLORS[p.kind] ?? '#cbd5e1'
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${c};border:2px solid #0a0c10;box-shadow:0 0 6px ${c}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      })
      L.marker([p.lat, p.lng], { icon })
        .addTo(layer)
        .bindPopup(`<b>${esc(p.label)}</b><br><span style="opacity:.6">${esc(p.kind)}</span>`)
      bounds.push([p.lat, p.lng])
    }
    if (bounds.length) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
  }, [pts])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-ink-700">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <MapIcon size={20} className="text-brand-glow" /> Map
          </h1>
          <p className="text-sm text-slate-500">Location entities and photo GPS plotted geographically. Named places are geocoded via OpenStreetMap.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
          <span className="text-xs text-slate-500">{pts.length} point{pts.length === 1 ? '' : 's'}</span>
          <select className="input !w-auto" value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value || null)}>
            <option value="">All investigations</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="btn-ghost border border-ink-600" onClick={collect} disabled={loading} title="Refresh">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        <div ref={mapEl} className="absolute inset-0" />
        {!loading && pts.length === 0 && (
          <div className="absolute inset-0 z-[500] pointer-events-none flex items-center justify-center">
            <div className="card px-4 py-3 text-sm text-slate-400 pointer-events-auto">
              No mapped locations yet — add location entities (or run IPinfo / EXIF transforms) and attach photos with GPS.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
