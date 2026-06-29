import { useState } from 'react'
import { GripVertical, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { Modal } from './ui'
import type { DashboardWidgetCfg } from '../lib/api'
import { type WidgetMeta, SIZE_LABEL, defaultLayout, nextSize } from '../lib/dashboard'

/** Edit which dashboard widgets appear, their order (drag), and their size.
 *  Changes are pushed up live via `onChange` so the dashboard updates behind
 *  the modal as you tweak it. */
export function DashboardCustomizer({
  open,
  onClose,
  meta,
  layout,
  onChange
}: {
  open: boolean
  onClose: () => void
  meta: WidgetMeta[]
  layout: DashboardWidgetCfg[]
  onChange: (next: DashboardWidgetCfg[]) => void
}): JSX.Element {
  const [dragId, setDragId] = useState<string | null>(null)
  const metaById = new Map(meta.map((m) => [m.id, m]))

  const toggle = (id: string): void =>
    onChange(layout.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)))

  const cycle = (id: string): void =>
    onChange(
      layout.map((w) => {
        if (w.id !== id) return w
        const m = metaById.get(id)
        return m ? { ...w, size: nextSize(m, w.size) } : w
      })
    )

  const reorder = (from: string, to: string): void => {
    if (from === to) return
    const next = [...layout]
    const fromIdx = next.findIndex((w) => w.id === from)
    const toIdx = next.findIndex((w) => w.id === to)
    if (fromIdx < 0 || toIdx < 0) return
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    onChange(next)
  }

  return (
    <Modal open={open} onClose={onClose} title="Customize dashboard">
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          Toggle widgets on or off, drag to reorder, and click a size to resize. Changes save automatically and apply
          to this appearance mode.
        </p>

        <div className="space-y-1.5">
          {layout.map((w) => {
            const m = metaById.get(w.id)
            if (!m) return null
            return (
              <div
                key={w.id}
                draggable
                onDragStart={() => setDragId(w.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragId && reorder(dragId, w.id)}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-colors ${
                  dragId === w.id ? 'border-brand/50 bg-ink-800' : 'border-ink-700 bg-ink-900/40'
                } ${w.visible ? '' : 'opacity-55'}`}
              >
                <GripVertical size={15} className="text-slate-600 cursor-grab shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-200 truncate">{m.label}</div>
                  {m.hint && <div className="text-[11px] text-slate-500 truncate">{m.hint}</div>}
                </div>

                {m.sizes.length > 1 && (
                  <button
                    onClick={() => cycle(w.id)}
                    disabled={!w.visible}
                    className="text-[11px] px-2 py-1 rounded-md border border-ink-600 text-slate-300 hover:border-brand/50 disabled:opacity-40 disabled:hover:border-ink-600 w-16 text-center"
                    title="Change size"
                  >
                    {SIZE_LABEL[w.size]}
                  </button>
                )}

                <button
                  onClick={() => toggle(w.id)}
                  className={`p-1.5 rounded-md border transition-colors ${
                    w.visible
                      ? 'border-ink-600 text-brand-glow hover:border-brand/50'
                      : 'border-ink-700 text-slate-500 hover:text-slate-300'
                  }`}
                  title={w.visible ? 'Hide widget' : 'Show widget'}
                >
                  {w.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-ink-700">
          <button
            className="btn-ghost text-xs"
            onClick={() => onChange(defaultLayout(meta))}
            title="Restore the default widgets, order and sizes"
          >
            <RotateCcw size={14} /> Reset to default
          </button>
          <button className="btn-primary text-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
