import type { OsintApi } from '../../../shared/types'
import { openInAppBrowser } from './browserBus'

const raw = window.api

/** Typed handle to the preload bridge.
 *
 *  `shell.openExternal` is overridden so that links never leave the app: every
 *  URL is opened as a tab in the in-app browser instead of the system browser.
 *  Main-process initiated opens (context menu, popups, target=_blank) are
 *  funneled to the same place via the `browser:open` IPC channel. */
export const api: OsintApi = {
  ...raw,
  shell: {
    ...raw.shell,
    openExternal: async (url: string): Promise<void> => {
      openInAppBrowser([url])
    }
  }
}

export * from '../../../shared/types'
