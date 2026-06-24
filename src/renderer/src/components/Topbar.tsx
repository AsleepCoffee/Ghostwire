import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { useOpenInBrowser } from '../lib/browserBus'

export function Topbar({ onQuickAdd }: { onQuickAdd?: () => void }): JSX.Element {
  const [q, setQ] = useState('')
  const openInBrowser = useOpenInBrowser()

  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!q.trim()) return
    openInBrowser([`https://duckduckgo.com/?q=${encodeURIComponent(q.trim())}`])
    setQ('')
  }

  return (
    <header className="h-16 shrink-0 flex items-center gap-4 px-5 border-b border-ink-700 bg-ink-900/60 backdrop-blur">
      <form onSubmit={submit} className="flex-1 max-w-2xl mx-auto relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the web in the embedded browser…"
          className="input pl-9 pr-16 bg-ink-850"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 border border-ink-600 rounded px-1.5 py-0.5">
          Enter
        </kbd>
      </form>
      <div className="flex items-center gap-2">
        {onQuickAdd && (
          <button className="btn-primary" onClick={onQuickAdd}>
            <Plus size={16} /> New
          </button>
        )}
      </div>
    </header>
  )
}
