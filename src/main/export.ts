import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import type { Note } from '../shared/types'

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
  writeFileSync(file, noteToMarkdown(note), 'utf-8')
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
