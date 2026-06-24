import { BrowserWindow } from 'electron'
import type { ToolHealth, ToolLink, ToolTestResult } from '../shared/types'

const TIMEOUT = 12000
const CONCURRENCY = 3
const TEST_PARTITION = 'gwtoolcheck'

function classify(finalUrl: string): ToolHealth {
  if (/login|sign[_-]?in|checkpoint|authwall|accounts\/login|\/auth/i.test(finalUrl)) return 'login'
  return 'ok'
}

function checkOne(rawUrl: string): Promise<{ health: ToolHealth; finalUrl: string }> {
  const url = rawUrl.replace('{QUERY}', 'test')
  return new Promise((resolve) => {
    let done = false
    const w = new BrowserWindow({
      show: false,
      webPreferences: { partition: TEST_PARTITION, images: false }
    })
    const finish = (health: ToolHealth, finalUrl = url): void => {
      if (done) return
      done = true
      clearTimeout(timer)
      try {
        w.destroy()
      } catch {
        /* already gone */
      }
      resolve({ health, finalUrl })
    }
    const timer = setTimeout(() => finish('error'), TIMEOUT)
    w.webContents.on('did-fail-load', (_e, code, _desc, _validated, isMainFrame) => {
      // -3 is ERR_ABORTED (e.g. redirect); ignore non-main-frame failures.
      if (isMainFrame && code !== -3) finish('blocked')
    })
    w.webContents.on('did-finish-load', () => {
      const fu = w.webContents.getURL()
      finish(classify(fu), fu)
    })
    w.loadURL(url).catch(() => finish('error'))
  })
}

/** Test all tools with bounded concurrency, calling onResult as each finishes. */
export async function testAllTools(
  tools: ToolLink[],
  onResult: (r: ToolTestResult, done: number, total: number) => void
): Promise<ToolTestResult[]> {
  const results: ToolTestResult[] = []
  let index = 0
  let completed = 0
  const total = tools.length

  async function worker(): Promise<void> {
    while (index < tools.length) {
      const t = tools[index++]
      let r: ToolTestResult
      try {
        const { health, finalUrl } = await checkOne(t.url)
        r = { id: t.id, name: t.name, health, finalUrl }
      } catch {
        r = { id: t.id, name: t.name, health: 'error' }
      }
      results.push(r)
      completed++
      onResult(r, completed, total)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker()))
  return results
}
