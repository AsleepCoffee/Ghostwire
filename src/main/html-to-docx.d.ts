declare module 'html-to-docx' {
  interface DocxOptions {
    title?: string
    margins?: { top?: number; right?: number; bottom?: number; left?: number }
    table?: { row?: { cantSplit?: boolean } }
    [key: string]: unknown
  }
  /** Convert an HTML string to a .docx document buffer. */
  export default function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString?: string | null,
    documentOptions?: DocxOptions,
    footerHTMLString?: string | null
  ): Promise<Buffer | ArrayBuffer>
}
