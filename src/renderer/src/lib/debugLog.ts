export interface LogEntry {
  at: number
  level: 'info' | 'warn' | 'error'
  source: string
  message: string
}

const KEY = 'gw_debug_log'
const MAX = 300

export function addLog(level: LogEntry['level'], source: string, message: string): void {
  try {
    const entries: LogEntry[] = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    entries.push({ at: Date.now(), level, source, message })
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX)))
  } catch {}
}

export function getLogs(): LogEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

export function clearLogs(): void {
  localStorage.removeItem(KEY)
}
