import {
  getCachedHighlightHtml,
  highlightCodeInThread,
  makeHighlightCacheKey,
  setCachedHighlightHtml,
  HIGHLIGHT_CACHE_MAX,
  HIGHLIGHT_MAX_CHARS
} from '@renderer/features/chat/highlightCore'
import type {
  HighlightWorkerRequest,
  HighlightWorkerResponse
} from '@renderer/features/chat/highlight.worker'

export { HIGHLIGHT_CACHE_MAX, HIGHLIGHT_MAX_CHARS }

let worker: Worker | null = null
let workerUnavailable = false
let nextRequestId = 1

const pendingById = new Map<
  number,
  { key: string; resolve: (html: string) => void; reject: (error: Error) => void }
>()
const inflightByKey = new Map<string, Promise<string>>()

function rejectAllPending(error: Error): void {
  for (const [id, pending] of pendingById) {
    pending.reject(error)
    pendingById.delete(id)
  }
  inflightByKey.clear()
}

function getHighlightWorker(): Worker | null {
  if (workerUnavailable) return null
  if (typeof Worker === 'undefined') {
    workerUnavailable = true
    return null
  }
  if (!worker) {
    try {
      worker = new Worker(new URL('./highlight.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<HighlightWorkerResponse>): void => {
        const msg = event.data
        if (msg.type !== 'highlight') return
        const pending = pendingById.get(msg.id)
        if (!pending) return
        pendingById.delete(msg.id)
        if (msg.ok) {
          setCachedHighlightHtml(pending.key, msg.html)
          pending.resolve(msg.html)
          return
        }
        pending.reject(new Error(msg.error))
      }
      worker.onerror = () => {
        workerUnavailable = true
        worker = null
        rejectAllPending(new Error('highlight worker failed'))
      }
    } catch {
      workerUnavailable = true
      return null
    }
  }
  return worker
}

/** Main-thread sync highlight (cache + fallback when Worker unavailable). */
export function highlightCode(code: string, language: string): string {
  return highlightCodeInThread(code, language)
}

function attachAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise
  if (signal.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'))
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      signal.removeEventListener('abort', onAbort)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort)
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    )
  })
}

/** Worker-backed highlight; dedupes in-flight requests by cache key. */
export function highlightCodeAsync(
  code: string,
  language: string,
  signal?: AbortSignal
): Promise<string> {
  const key = makeHighlightCacheKey(code, language)
  const cached = getCachedHighlightHtml(key)
  if (cached !== undefined) {
    return attachAbort(Promise.resolve(cached), signal)
  }

  const inflight = inflightByKey.get(key)
  if (inflight) {
    return attachAbort(inflight, signal)
  }

  const w = getHighlightWorker()
  if (!w) {
    return attachAbort(Promise.resolve(highlightCode(code, language)), signal)
  }

  const promise = new Promise<string>((resolve, reject) => {
    const id = nextRequestId++
    pendingById.set(id, { key, resolve, reject })
    const request: HighlightWorkerRequest = { type: 'highlight', id, code, language }
    w.postMessage(request)
  }).finally(() => {
    if (inflightByKey.get(key) === promise) {
      inflightByKey.delete(key)
    }
  })

  inflightByKey.set(key, promise)
  return attachAbort(promise, signal)
}

/** Test-only: reset worker singleton between cases. */
export function resetHighlightWorkerForTests(): void {
  worker?.terminate()
  worker = null
  workerUnavailable = false
  nextRequestId = 1
  pendingById.clear()
  inflightByKey.clear()
}
