import type { DetailedHTMLProps, HTMLAttributes, Ref } from 'react'
import type { OsintApi } from '../../shared/types'

type WebviewProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string
  partition?: string
  allowpopups?: string
  useragent?: string
  preload?: string
  webpreferences?: string
  ref?: Ref<HTMLElement>
}

declare global {
  interface Window {
    api: OsintApi
  }

  // Back-compat: classic global JSX namespace.
  namespace JSX {
    interface IntrinsicElements {
      webview: WebviewProps
    }
  }
}

// react-jsx runtime resolves intrinsic elements from the 'react' module's JSX namespace.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      webview: WebviewProps
    }
  }
}

export {}
