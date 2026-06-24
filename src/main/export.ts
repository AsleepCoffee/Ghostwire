import { join, basename } from 'path'
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'fs'
import type { Note } from '../shared/types'
import { resolveMediaPath } from './media'

/** Copy any gwmedia:// images referenced in the body into <baseDir>/attachments
 *  and rewrite the markdown to relative attachment paths (Obsidian-friendly). */
function externalizeImages(body: string, baseDir: string): string {
  const urls = new Set<string>()
  const re = /gwmedia:\/\/[^\s)"']+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) urls.add(m[0])
  if (urls.size === 0) return body
  const attachDir = join(baseDir, 'attachments')
  if (!existsSync(attachDir)) mkdirSync(attachDir, { recursive: true })
  let out = body
  for (const url of urls) {
    const src = resolveMediaPath(url)
    if (!src) continue
    const file = basename(src)
    copyFileSync(src, join(attachDir, file))
    out = out.split(url).join(`attachments/${file}`)
  }
  return out
}

/** Make a filesystem-safe filename from a note title. */
function safeName(title: string): string {
  return (
    title
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'untitled'
  )
}

/** Render a note as Obsidian-friendly Markdown with YAML frontmatter. */
export function noteToMarkdown(note: Note): string {
  const created = new Date(note.createdAt).toISOString()
  const updated = new Date(note.updatedAt).toISOString()
  const tags = note.tags.length ? note.tags.map((t) => `  - ${t}`).join('\n') : ''
  const fm = [
    '---',
    `title: ${JSON.stringify(note.title)}`,
    `folder: ${JSON.stringify(note.folder)}`,
    tags ? `tags:\n${tags}` : 'tags: []',
    `created: ${created}`,
    `updated: ${updated}`,
    `source: GhostWire`,
    '---',
    ''
  ].join('\n')
  return `${fm}\n${note.body}\n`
}

/** Write a single note into <vault>/<folder>/<title>.md and return the path. */
export function writeNote(vaultPath: string, note: Note): string {
  const folderDir = join(vaultPath, note.folder || 'Inbox')
  if (!existsSync(folderDir)) mkdirSync(folderDir, { recursive: true })
  const file = join(folderDir, `${safeName(note.title)}.md`)
  const withImages = { ...note, body: externalizeImages(note.body, folderDir) }
  writeFileSync(file, noteToMarkdown(withImages), 'utf-8')
  return file
}

/** Export every note into the vault. Returns count and target dir. */
export function exportAllNotes(vaultPath: string, notes: Note[]): { exported: number; dir: string } {
  const dir = join(vaultPath, 'GhostWire')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  let exported = 0
  for (const n of notes) {
    writeNote(dir, n)
    exported++
  }
  return { exported, dir }
}
