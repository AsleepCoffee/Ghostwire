import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Modal } from '../components/ui'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>

const Ctx = createContext<ConfirmFn>(async () => false)

export function ConfirmProvider({ children }: { children: ReactNode }): JSX.Element {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>(
    (o) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve
        setOpts(o)
      }),
    []
  )

  const done = (v: boolean): void => {
    resolver.current?.(v)
    resolver.current = null
    setOpts(null)
  }

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Modal open={!!opts} onClose={() => done(false)} title={opts?.title ?? ''}>
        {opts?.message && <p className="text-sm text-slate-400 leading-relaxed">{opts.message}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button className="btn-ghost" onClick={() => done(false)}>
            {opts?.cancelText ?? 'Cancel'}
          </button>
          <button
            className={
              opts?.danger
                ? 'btn bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25'
                : 'btn-primary'
            }
            onClick={() => done(true)}
            autoFocus
          >
            {opts?.confirmText ?? 'Confirm'}
          </button>
        </div>
      </Modal>
    </Ctx.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  return useContext(Ctx)
}
