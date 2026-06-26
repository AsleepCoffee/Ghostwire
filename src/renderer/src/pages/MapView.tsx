import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Map as MapIcon, Loader2, RefreshCw } from 'lucide-react'
import { api, type Project } from '../lib/api'
import { useSettings } from '../lib/settings'
import { useOpenInBrowser } from '../lib/browserBus'

interface Pt {
  lat: number
  lng: number
  label: string
  kind: string
  /** Set for a manually-pinned evidence location — lets it be removed from the map. */
  evidenceId?: string
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
  const openInBrowser = useOpenInBrowser()
  const openRef = useRef(openInBrowser)
  openRef.current = openInBrowser
  const removeRef = useRef<(id: string) => void>(() => {})
  const [renaming, setRenaming] = useState<{ id: string; lat: number; lng: number; label: string } | null>(null)
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
        // A pinned location (from EXIF, an AI guess, or set by hand) wins; else fall back to raw EXIF GPS.
        if (item.geoLat != null && item.geoLng != null) {
          out.push({ lat: item.geoLat, lng: item.geoLng, label: item.geoLabel || item.title || 'Evidence', kind: 'evidence', evidenceId: item.id })
          continue
        }
        const ex = await api.files.exif(item.path)
        if (ex.gps) out.push({ lat: ex.gps.lat, lng: ex.gps.lng, label: item.title || 'Evidence', kind: 'evidence' })
      }
    } finally {
      setPts(out)
      setLoading(false)
    }
  }

  // Clear a manually-pinned evidence location, then refresh the map.
  removeRef.current = (id: string): void => {
    api.evidence.setGeo(id, null, null, '').then(() => collect())
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
        .bindPopup(
          `<b>${esc(p.label)}</b><br><span style="opacity:.6">${esc(p.kind)}</span><br>` +
            `<a href="#" data-sv="${p.lat},${p.lng}" style="color:#2563eb">📍 Street View</a>` +
            (p.evidenceId
              ? `<br><a href="#" data-rn="${esc(p.evidenceId)}" data-lat="${p.lat}" data-lng="${p.lng}" data-label="${esc(p.label)}" style="color:#2563eb">✎ Rename</a>` +
                `<br><a href="#" data-rm="${esc(p.evidenceId)}" style="color:#dc2626">✕ Remove pin</a>`
              : '')
        )
      bounds.push([p.lat, p.lng])
    }
    if (bounds.length) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
  }, [pts])

  // Open Google Street View (in the in-app browser) from a marker popup.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const onOpen = (e: L.PopupEvent): void => {
      const root = e.popup.getElement()
      const sv = root?.querySelector('[data-sv]') as HTMLAnchorElement | null
      if (sv) {
        sv.onclick = (ev): void => {
          ev.preventDefault()
          const [lat, lng] = (sv.dataset.sv ?? '').split(',')
          openRef.current([`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`])
        }
      }
      const rm = root?.querySelector('[data-rm]') as HTMLAnchorElement | null
      if (rm) {
        rm.onclick = (ev): void => {
          ev.preventDefault()
          e.popup.remove()
          removeRef.current(rm.dataset.rm ?? '')
        }
      }
      const rn = root?.querySelector('[data-rn]') as HTMLAnchorElement | null
      if (rn) {
        rn.onclick = (ev): void => {
          ev.preventDefault()
          e.popup.remove()
          setRenaming({
            id: rn.dataset.rn ?? '',
            lat: Number(rn.dataset.lat),
            lng: Number(rn.dataset.lng),
            label: rn.dataset.label ?? ''
          })
        }
      }
    }
    map.on('popupopen', onOpen)
    return () => {
      map.off('popupopen', onOpen)
    }
  }, [])

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

      {renaming && (
        <div className="absolute inset-0 z-[1000] bg-black/60 flex items-center justify-center" onClick={() => setRenaming(null)}>
          <div className="card p-4 w-80" onClick={(e) => e.stopPropagation()}>
            <div className="label">Rename pin</div>
            <input
              className="input"
              autoFocus
              value={renaming.label}
              onChange={(e) => setRenaming((r) => (r ? { ...r, label: e.target.value } : r))}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setRenaming(null)
                if (e.key === 'Enter') {
                  const r = renaming
                  api.evidence.setGeo(r.id, r.lat, r.lng, r.label.trim()).then(() => collect())
                  setRenaming(null)
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button className="btn-ghost border border-ink-600" onClick={() => setRenaming(null)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => {
                  const r = renaming
                  api.evidence.setGeo(r.id, r.lat, r.lng, r.label.trim()).then(() => collect())
                  setRenaming(null)
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
