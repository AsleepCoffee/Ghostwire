import { Ghost, LayoutDashboard, Check, Sparkles } from 'lucide-react'
import icon from '../assets/icon.png'
import { useSettings, THEMES } from '../lib/settings'

/** Shown on first launch and once after each update (App decides when). Lets the
 *  user pick an appearance mode and theme before diving in. Choices apply live
 *  via the settings context, so the app behind the modal previews instantly. */
export function WelcomeModal({
  version,
  isUpdate,
  onDone
}: {
  version: string
  isUpdate: boolean
  onDone: () => void
}): JSX.Element {
  const { settings, update } = useSettings()
  const ghost = settings.ghostMode === true
  const theme = settings.theme ?? 'midnight'

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 backdrop-blur-sm p-6 overflow-y-auto">
      <div className="card mt-10 w-full max-w-2xl shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <img src={icon} alt="GhostWire" className="w-12 h-12 rounded-xl object-cover shadow-glow" />
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-accent-glow flex items-center gap-1.5">
                {isUpdate ? (
                  <>
                    <Sparkles size={12} /> Updated to v{version}
                  </>
                ) : (
                  'Welcome'
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                {isUpdate ? 'Confirm your look' : 'Welcome to GhostWire'}
              </h2>
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-3">
            {isUpdate
              ? 'A quick check-in after the update — pick the appearance you want. You can change this anytime in Settings.'
              : 'Choose how GhostWire looks. You can change any of this later in Settings → Appearance.'}
          </p>

          {/* Appearance mode */}
          <div className="mt-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Appearance mode</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => update({ ghostMode: false })}
                className={`relative rounded-xl border p-4 text-left transition-colors ${
                  !ghost ? 'border-brand bg-brand/10' : 'border-ink-700 hover:border-ink-600'
                }`}
              >
                {!ghost && <Check size={16} className="absolute top-3 right-3 text-brand-glow" />}
                <LayoutDashboard size={22} className="text-brand-glow" />
                <div className="font-semibold text-slate-100 mt-2">Standard</div>
                <div className="text-xs text-slate-500 mt-0.5">Clean workbench with a subtle backdrop.</div>
              </button>
              <button
                onClick={() => update({ ghostMode: true })}
                className={`relative rounded-xl border p-4 text-left transition-colors ${
                  ghost ? 'border-accent bg-accent/10' : 'border-ink-700 hover:border-ink-600'
                }`}
              >
                {ghost && <Check size={16} className="absolute top-3 right-3 text-accent-glow" />}
                <Ghost size={22} className="text-accent-glow" />
                <div className="font-semibold text-slate-100 mt-2">GhostWire</div>
                <div className="text-xs text-slate-500 mt-0.5">Immersive HUD command-center with particles.</div>
              </button>
            </div>
          </div>

          {/* Theme */}
          <div className="mt-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Color theme</div>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
              {THEMES.map((t) => {
                const on = theme === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => update({ theme: t.id })}
                    className={`relative rounded-lg border p-2.5 text-left transition-colors ${
                      on ? 'border-brand bg-brand/10' : 'border-ink-700 hover:border-ink-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-4 h-4 rounded-full" style={{ background: `rgb(${t.brand})` }} />
                      <span className="w-3 h-3 rounded-full" style={{ background: `rgb(${t.accent})` }} />
                      {on && <Check size={13} className="ml-auto text-brand-glow" />}
                    </div>
                    <div className="text-xs font-medium text-slate-200">{t.label}</div>
                    <div className="text-[10px] text-slate-500 truncate">{t.blurb}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button className="btn-primary" onClick={onDone}>
              {isUpdate ? 'Continue' : "Let's go"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
