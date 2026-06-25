import { useEffect, useState, type CSSProperties } from 'react'
import { Minus, Square, Copy, X } from 'lucide-react'
import { api } from '../lib/api'
import iconUrl from '../assets/icon.png'

// -webkit-app-region isn't in the CSSProperties type; declare small helpers.
const DRAG = { WebkitAppRegion: 'drag' } as unknown as CSSProperties
const NO_DRAG = { WebkitAppRegion: 'no-drag' } as unknown as CSSProperties

/** Custom themed window title bar (frameless window). */
export function TitleBar(): JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    api.win.isMaximized().then(setMaximized)
    return api.win.onMaximizeChange(setMaximized)
  }, [])

  return (
    <div
      className="h-8 shrink-0 flex items-center bg-ink-950 border-b border-ink-700 select-none"
      style={DRAG}
    >
      <div className="flex items-center gap-2 px-3">
        <img src={iconUrl} alt="" className="w-4 h-4 rounded-sm" />
        <span className="text-xs font-semibold text-slate-300 tracking-wide">GhostWire</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-stretch self-stretch" style={NO_DRAG}>
        <button
          onClick={() => api.win.minimize()}
          className="w-11 grid place-items-center text-slate-400 hover:bg-ink-700 hover:text-slate-100 transition-colors"
          title="Minimize"
        >
          <Minus size={15} />
        </button>
        <button
          onClick={() => api.win.toggleMaximize()}
          className="w-11 grid place-items-center text-slate-400 hover:bg-ink-700 hover:text-slate-100 transition-colors"
          title={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? <Copy size={13} /> : <Square size={13} />}
        </button>
        <button
          onClick={() => api.win.close()}
          className="w-11 grid place-items-center text-slate-400 hover:bg-danger hover:text-white transition-colors"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
