import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import tzlookup from 'tz-lookup'
import { MapPin, Check } from 'lucide-react'
import { Modal } from './ui'
import { timeInZone } from '../lib/timezones'

/** Pick an IANA time zone by clicking a location on a map. */
export function TimezonePicker({
  open,
  onClose,
  onPick
}: {
  open: boolean
  onClose: () => void
  onPick: (tz: string) => void
}): JSX.Element | null {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [tz, setTz] = useState('')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!open) return
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [open])

  useEffect(() => {
    if (!open || !elRef.current || mapRef.current) return
    const m = L.map(elRef.current, { zoomControl: true, attributionControl: false, worldCopyJump: true }).setView([25, 0], 1)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) => {
      let zone = ''
      try {
        zone = tzlookup(e.latlng.lat, e.latlng.lng)
      } catch {
        zone = ''
      }
      setTz(zone)
      if (markerRef.current) markerRef.current.setLatLng(e.latlng)
      else
        markerRef.current = L.marker(e.latlng, {
          icon: L.divIcon({ className: '', html: '<div style="width:14px;height:14px;border-radius:50%;background:#22d3ee;border:2px solid #0a0c10;box-shadow:0 0 6px #22d3ee"></div>', iconSize: [14, 14], iconAnchor: [7, 7] })
        }).addTo(m)
    })
    mapRef.current = m
    setTimeout(() => m.invalidateSize(), 80)
    return () => {
      m.remove()
      mapRef.current = null
      markerRef.current = null
      setTz('')
    }
  }, [open])

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title="Pick a time zone on the map" wide>
      <div className="space-y-3">
        <div ref={elRef} className="w-full h-80 rounded-lg overflow-hidden border border-ink-700 bg-ink-950" />
        <div className="flex items-center gap-3">
          <MapPin size={16} className="text-brand-glow shrink-0" />
          {tz ? (
            <div className="min-w-0">
              <div className="text-sm text-slate-100 font-medium truncate">{tz}</div>
              <div className="text-xs text-slate-500">Local time there: <span className="tabular-nums">{timeInZone(now, tz)}</span></div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">Click anywhere on the map to choose a zone.</div>
          )}
          <button className="btn-primary ml-auto" disabled={!tz} onClick={() => { onPick(tz); onClose() }}>
            <Check size={15} /> Use this zone
          </button>
        </div>
      </div>
    </Modal>
  )
}
