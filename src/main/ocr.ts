import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { gunzipSync } from 'zlib'
import { createWorker, type Worker } from 'tesseract.js'

/** Offline OCR via tesseract.js. The English model is bundled with the app
 *  (resources/tessdata/eng.traineddata.gz) so it works with no internet. */
let workerPromise: Promise<Worker> | null = null

function tessdataDir(): string {
  return app.isPackaged ? join(process.resourcesPath, 'tessdata') : join(app.getAppPath(), 'resources', 'tessdata')
}

function cacheDir(): string {
  const dir = join(app.getPath('userData'), 'tesscache')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * tesseract.js loads its language model from the cache if present, otherwise it
 * fetches it from `langPath`. In a packaged Electron app `is-electron` reports the
 * worker environment as `electron` (not `node`), so tesseract treats `langPath` as
 * a URL and calls `fetch()` on the relative bundle path — which Node rejects with
 * "Only absolute URLs are supported". We avoid that code path entirely by
 * decompressing the bundled model straight into the cache dir as `eng.traineddata`,
 * so the cache read succeeds and no network request is ever attempted.
 */
function ensureLangInCache(): void {
  const cached = join(cacheDir(), 'eng.traineddata')
  // A valid model is ~15 MB; anything smaller is a partial/corrupt write — rebuild it.
  if (existsSync(cached) && statSync(cached).size > 1_000_000) return
  const gz = join(tessdataDir(), 'eng.traineddata.gz')
  if (!existsSync(gz)) throw new Error('Bundled OCR language model (eng.traineddata.gz) is missing')
  writeFileSync(cached, gunzipSync(readFileSync(gz)))
}

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    ensureLangInCache()
    workerPromise = createWorker('eng', 1, {
      langPath: tessdataDir(),
      cachePath: cacheDir(),
      gzip: false
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
