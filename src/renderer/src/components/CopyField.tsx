import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { api } from '../lib/api'

/** A click-to-copy chip for one labelled value. Renders nothing when empty.
 *  Uses the Electron clipboard (the web Clipboard API is blocked under file://). */
export function CopyField({ label, value }: { label: string; value?: string }): JSX.Element | null {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  const copy = async (): Promise<void> => {
    await api.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label}`}
      className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-ink-900 border border-ink-700 hover:border-accent/40 transition-colors text-left min-w-0 w-full"
    >
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
        <div className="text-sm text-slate-200 truncate font-mono">{value}</div>
      </div>
      {copied ? (
        <Check size={13} className="text-ok shrink-0" />
      ) : (
        <Copy size={13} className="text-slate-600 group-hover:text-accent shrink-0" />
      )}
    </button>
  )
}
