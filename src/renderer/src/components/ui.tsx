import { ReactNode, useEffect } from 'react'
import * as Lucide from 'lucide-react'
import { X } from 'lucide-react'

/** Render a lucide icon by name (falls back to a dot). */
export function Icon({
  name,
  size = 18,
  className,
  style
}: {
  name: string
  size?: number
  className?: string
  style?: React.CSSProperties
}): JSX.Element {
  const Cmp = (Lucide as unknown as Record<string, Lucide.LucideIcon>)[name] ?? Lucide.Circle
  return <Cmp size={size} className={className} style={style} />
}

export function StatusDot({ color }: { color: string }): JSX.Element {
  return <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-ok/15 text-ok border-ok/30',
  draft: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  burned: 'bg-danger/15 text-danger border-danger/30',
  paused: 'bg-warn/15 text-warn border-warn/30',
  inactive: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
}

export function StatusBadge({ status }: { status: string }): JSX.Element {
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.draft
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${cls}`}
    >
      {status}
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action
}: {
  icon: string
  title: string
  subtitle?: string
  action?: ReactNode
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-ink-800 border border-ink-700 flex items-center justify-center mb-4">
        <Icon name={icon} size={26} className="text-slate-500" />
      </div>
      <h3 className="text-slate-200 font-semibold">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}): JSX.Element | null {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-6 overflow-y-auto"
      onMouseDown={onClose}
    >
      <div
        className={`card mt-12 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-700">
          <h2 className="font-semibold text-slate-100">{title}</h2>
          <button className="btn-ghost !p-1.5" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Panel({
  title,
  action,
  children,
  className = '',
  bodyClassName = ''
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}): JSX.Element {
  return (
    <section className={`card flex flex-col min-h-0 ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between px-4 py-3 border-b border-ink-700 shrink-0">
          <div className="font-semibold text-slate-100 text-sm">{title}</div>
          {action}
        </header>
      )}
      <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
