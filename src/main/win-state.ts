// Shared flag so the main window's 'maximize' event handler can tell whether
// the maximize was triggered intentionally via the in-app topbar button, or
// accidentally by the OS (double-clicking an Electron drag region).
let _intentional = false

/** Call this immediately before programmatically maximising the window. */
export function setIntentionalMaximize(): void {
  _intentional = true
  setTimeout(() => {
    _intentional = false
  }, 400)
}

/** Returns true (and clears the flag) if the last maximize was intentional. */
export function consumeIntentionalMaximize(): boolean {
  const v = _intentional
  _intentional = false
  return v
}
