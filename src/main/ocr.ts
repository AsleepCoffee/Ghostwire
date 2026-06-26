import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { createWorker, type Worker } from 'tesseract.js'

/** Offline OCR via tesseract.js. The English model is bundled with the app
 *  (resources/tessdata/eng.traineddata.gz) so it works with no internet. */
let workerPromise: Promise<Worker> | null = null

function langPath(): string {
  return app.isPackaged ? join(process.resourcesPath, 'tessdata') : join(app.getAppPath(), 'resources', 'tessdata')
}

function cachePath(): string {
  const dir = join(app.getPath('userData'), 'tesscache')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      langPath: langPath(),
      cachePath: cachePath(),
      gzip: true
    })
  }
  return workerPromise
}

/** Recognize text in an image buffer. Returns trimmed text ('' if none). */
export async function ocrImage(buf: Buffer): Promise<string> {
  const worker = await getWorker()
  const { data } = await worker.recognize(buf)
  return (data.text ?? '').trim()
}

export async function shutdownOcr(): Promise<void> {
  if (!workerPromise) return
  try {
    const w = await workerPromise
    await w.terminate()
  } catch {
    /* ignore */
  }
  workerPromise = null
}
