import { highlightCodeInThread } from '@renderer/features/chat/highlightCore'

export type HighlightWorkerRequest = {
  type: 'highlight'
  id: number
  code: string
  language: string
}

export type HighlightWorkerResponse =
  | { type: 'highlight'; id: number; ok: true; html: string }
  | { type: 'highlight'; id: number; ok: false; error: string }

self.onmessage = (event: MessageEvent<HighlightWorkerRequest>): void => {
  const msg = event.data
  if (msg.type !== 'highlight') return
  try {
    const html = highlightCodeInThread(msg.code, msg.language)
    const response: HighlightWorkerResponse = { type: 'highlight', id: msg.id, ok: true, html }
    self.postMessage(response)
  } catch (error) {
    const response: HighlightWorkerResponse = {
      type: 'highlight',
      id: msg.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }
    self.postMessage(response)
  }
}
