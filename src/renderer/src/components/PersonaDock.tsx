import { Fingerprint, X, ChevronRight, Copy, Check, Globe } from 'lucide-react'
import { useState } from 'react'
import { usePersonaDock } from '../lib/dock'
import { useOpenInBrowser } from '../lib/browserBus'
import { identityFields, identityText } from '../lib/identity'
import { personaColor } from '../lib/constants'
import { CopyField } from './CopyField'
import { api } from '../lib/api'

/** An always-on-top, collapsible reference card for the pinned persona. Stays
 *  visible across tabs (incl. the Browser) so you can copy details into sign-up
 *  forms without losing the sock-puppet card. */
export function PersonaDock(): JSX.Element | null {
  const { persona, open, setOpen, unpin } = usePersonaDock()
  const openInBrowser = useOpenInBrowser()
  const [copiedAll, setCopiedAll] = useState(false)

  if (!persona) return null

  // Collapsed: a slim tab on the right edge.
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title={`Show ${persona.name}'s details`}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-2 px-2 py-3 rounded-l-xl bg-ink-800 border border-r-0 border-ink-600 hover:bg-ink-700 shadow-xl"
        style={{ writingMode: 'vertical-rl' }}
      >
        <Fingerprint size={16} style={{ color: personaColor(persona.id) }} />
        <span className="text-xs font-medium text-slate-200 truncate max-h-32">{persona.name}</span>
      </button>
    )
  }

  const fields = identityFields(persona)
  const accounts = (persona.accounts ?? []).filter((a) => a.username || a.password)

  const copyAll = async (): Promise<void> => {
    await api.clipboard.writeText(identityText(persona))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1400)
  }

  return (
    <aside className="fixed right-3 top-12 bottom-3 z-40 w-80 flex flex-col card !bg-ink-850 shadow-2xl border-ink-600 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-2.5 p-3 border-b border-ink-700">
        {persona.avatarPath ? (
          <img src={persona.avatarPath} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" style={{ border: `1px solid ${personaColor(persona.id)}66` }} />
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${personaColor(persona.id)}22`, border: `1px solid ${personaColor(persona.id)}66` }}>
            <Fingerprint size={17} style={{ color: personaColor(persona.id) }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-100 truncate">{persona.name}</div>
          <div className="text-xs text-slate-500 truncate">@{persona.handle}</div>
        </div>
        <button className="btn-ghost !p-1.5" title="Collapse" onClick={() => setOpen(false)}>
          <ChevronRight size={16} />
        </button>
        <button className="btn-ghost !p-1.5" title="Unpin" onClick={unpin}>
          <X size={16} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-700">
        <button className="btn-ghost border border-ink-600 text-xs flex-1" onClick={() => openInBrowser(['https://duckduckgo.com/'], persona.id)}>
          <Globe size={13} /> Browse as
        </button>
        <button className="btn-ghost border border-ink-600 text-xs flex-1" onClick={copyAll}>
          {copiedAll ? <Check size={13} className="text-ok" /> : <Copy size={13} />} Copy all
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Identity</div>
          <div className="space-y-1.5">
            {fields.map((f) => (
              <CopyField key={f.label} label={f.label} value={f.value} />
            ))}
          </div>
        </div>

        {accounts.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Account credentials</div>
            <div className="space-y-2.5">
              {accounts.map((a, i) => (
                <div key={i} className="rounded-lg border border-ink-700 p-2 space-y-1.5">
                  <div className="text-xs font-medium text-slate-300">{a.platform}</div>
                  <CopyField label="Username" value={a.username} />
                  <CopyField label="Password" value={a.password} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-ink-700 text-[10px] text-slate-600">
        Click any field to copy. This panel stays put while you fill sign-up forms.
      </div>
    </aside>
  )
}
