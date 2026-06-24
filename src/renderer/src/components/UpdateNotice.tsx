import { useEffect, useRef, useState } from 'react'
import { DownloadCloud, Sparkles } from 'lucide-react'
import { api, type UpdateStatus } from '../lib/api'
import { Modal } from './ui'

/** App-wide update prompt: when an update is available the user gets
 *  Install / Skip for now; after downloading, Restart & install / Later. */
export function UpdateNotice(): JSX.Element | null {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [open, setOpen] = useState(false)
  const skipped = useRef<string | null>(null)

  useEffect(() => {
    return api.updates.onStatus((s) => {
      setStatus(s)
      if (s.state === 'available' && s.version && skipped.current !== s.version) setOpen(true)
      if (s.state === 'ready') setOpen(true)
      if (s.state === 'error' || s.state === 'none' || s.state === 'dev') {
        // nothing to prompt
      }
    })
  }, [])

  if (!open || !status) return null
  const version = status.version ? `v${status.version}` : 'A new version'

  const skip = (): void => {
    if (status.version) skipped.current = status.version
    setOpen(false)
  }

  return (
    <Modal open={open} onClose={skip} title="Update available">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center shrink-0">
          <Sparkles size={22} className="text-brand-glow" />
        </div>
        <div className="min-w-0">
          {status.state === 'downloading' ? (
            <>
              <p className="text-slate-200 font-medium">Downloading {version}…</p>
              <div className="mt-3 h-2 w-full bg-ink-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand transition-all" style={{ width: `${status.percent ?? 0}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">{status.percent ?? 0}% — you can keep working.</p>
            </>
          ) : status.state === 'ready' ? (
            <p className="text-slate-200">
              <b>{version}</b> has been downloaded and is ready to install. GhostWire will restart.
            </p>
          ) : (
            <p className="text-slate-200">
              <b>{version}</b> of GhostWire is available. Install it now, or skip for now and decide later in
              Settings.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        {status.state === 'ready' ? (
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Later
            </button>
            <button className="btn-primary" onClick={() => api.updates.install()}>
              <DownloadCloud size={16} /> Restart & install
            </button>
          </>
        ) : status.state === 'downloading' ? (
          <button className="btn-ghost" onClick={() => setOpen(false)}>
            Hide
          </button>
        ) : (
          <>
            <button className="btn-ghost" onClick={skip}>
              Skip for now
            </button>
            <button className="btn-primary" onClick={() => api.updates.download()}>
              <DownloadCloud size={16} /> Install update
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
