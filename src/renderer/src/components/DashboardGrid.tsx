import { useState, type ReactNode } from 'react'
import { GripVertical, X, Plus, Check, Pencil, Maximize2, RotateCcw } from 'lucide-react'
import type { DashboardWidgetCfg } from '../lib/api'
import { type WidgetMeta, SIZE_SPAN, SIZE_LABEL, nextSize, defaultLayout } from '../lib/dashboard'

/** Renders the dashboard widget grid, with an in-place "Edit layout" mode:
 *  toggle it on to drag widgets to reorder, resize each one, remove it, or add
 *  hidden ones from the "+ Add widget" tray. Persisted layout changes flow up
 *  through `onChange`. Shared by both the Standard and GhostWire dashboards. */
export function DashboardGrid({
  meta,
  layout,
  nodes,
  onChange
}: {
  meta: WidgetMeta[]
  layout: DashboardWidgetCfg[]
  nodes: Record<string, ReactNode>
  onChange: (next: DashboardWidgetCfg[]) => void
}): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const metaById = new Map(meta.map((m) => [m.id, m]))
  const visible = layout.filter((w) => w.visible && nodes[w.id])
  const hidden = layout.filter((w) => !w.visible && nodes[w.id])

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

  const cycle = (id: string): void =>
    onChange(
      layout.map((w) => {
        if (w.id !== id) return w
        const m = metaById.get(id)
        return m ? { ...w, size: nextSize(m, w.size) } : w
      })
    )

  const setVisible = (id: string, vis: boolean): void => {
    // When showing a widget, move it to the end so it lands where the user expects.
    if (vis) {
      const w = layout.find((x) => x.id === id)
      if (!w) return
      onChange([...layout.filter((x) => x.id !== id), { ...w, visible: true }])
    } else {
      onChange(layout.map((w) => (w.id === id ? { ...w, visible: false } : w)))
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 mb-3">
        {editing && (
          <>
            <div className="relative">
              <button
                onClick={() => setAdding((v) => !v)}
                className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ink-600 text-slate-300 hover:border-brand/50 hover:text-brand-glow transition-colors"
                title="Add a widget"
              >
                <Plus size={14} /> Add widget
              </button>
              {adding && (
                <div className="absolute right-0 mt-1.5 w-64 z-30 card p-2 shadow-2xl">
                  {hidden.length === 0 ? (
                    <div className="text-xs text-slate-500 px-2 py-3 text-center">
                      Every widget is already on the dashboard.
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-72 overflow-y-auto">
                      {hidden.map((w) => {
                        const m = metaById.get(w.id)
                        if (!m) return null
                        return (
                          <button
                            key={w.id}
                            onClick={() => setVisible(w.id, true)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-ink-800 transition-colors"
                          >
                            <Plus size={14} className="text-brand-glow shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-slate-200 truncate">{m.label}</div>
                              {m.hint && <div className="text-[11px] text-slate-500 truncate">{m.hint}</div>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => onChange(defaultLayout(meta))}
              className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ink-600 text-slate-400 hover:border-ink-500 hover:text-slate-200 transition-colors"
              title="Reset to the default layout"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </>
        )}
        <button
          onClick={() => {
            setEditing((v) => !v)
            setAdding(false)
          }}
          className={`text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
            editing
              ? 'border-brand bg-brand/15 text-brand-glow'
              : 'border-ink-600 text-slate-400 hover:border-brand/50 hover:text-brand-glow'
          }`}
        >
          {editing ? <Check size={14} /> : <Pencil size={14} />} {editing ? 'Done' : 'Edit layout'}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          No widgets shown.{' '}
          <button
            className="text-brand-glow hover:underline"
            onClick={() => {
              setEditing(true)
              setAdding(true)
            }}
          >
            Add some
          </button>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {visible.map((w) => {
            const m = metaById.get(w.id)
            return (
              <div
                key={w.id}
                className={`${SIZE_SPAN[w.size]} ${editing ? 'relative' : ''}`}
                draggable={editing}
                onDragStart={() => editing && setDragId(w.id)}
                onDragEnd={() => {
                  setDragId(null)
                  setOverId(null)
                }}
                onDragOver={(e) => {
                  if (!editing) return
                  e.preventDefault()
                  setOverId(w.id)
                }}
                onDrop={() => {
                  if (editing && dragId) reorder(dragId, w.id)
                  setOverId(null)
                }}
              >
                {editing && (
                  <div
                    className={`absolute inset-0 z-20 rounded-xl border-2 border-dashed transition-colors ${
                      overId === w.id && dragId !== w.id
                        ? 'border-brand bg-brand/10'
                        : dragId === w.id
                          ? 'border-brand/40 opacity-50'
                          : 'border-brand/30 bg-ink-950/10'
                    } cursor-grab active:cursor-grabbing`}
                  >
                    <div className="absolute top-2 left-2 flex items-center gap-1 text-brand-glow">
                      <GripVertical size={16} />
                      <span className="text-[11px] font-medium">{m?.label}</span>
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {m && m.sizes.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            cycle(w.id)
                          }}
                          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-ink-900/90 border border-ink-600 text-slate-200 hover:border-brand/60"
                          title="Resize"
                        >
                          <Maximize2 size={12} /> {SIZE_LABEL[w.size]}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setVisible(w.id, false)
                        }}
                        className="p-1 rounded-md bg-ink-900/90 border border-ink-600 text-slate-300 hover:text-danger hover:border-danger/50"
                        title="Remove widget"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
                <div className={editing ? 'pointer-events-none select-none opacity-90' : ''}>{nodes[w.id]}</div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
