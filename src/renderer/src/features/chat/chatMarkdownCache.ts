import type { ReactElement } from 'react'

const MARKDOWN_CACHE_MAX = 200
const cache = new Map<string, ReactElement>()
const order: string[] = []

export function hashChatText(text: string): string {
  let h = 0
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0
  }
  return `${h}:${text.length}`
}

export function buildMarkdownCacheKey(
  msgId: string | undefined,
  text: string,
  variant: string,
  theme: string
): string {
  const idPart = msgId ?? '_'
  return `${idPart}:${hashChatText(text)}:${variant}:${theme}`
}

export function getCachedMarkdownBody(key: string): ReactElement | undefined {
  const hit = cache.get(key)
  if (hit === undefined) return undefined
  const idx = order.indexOf(key)
  if (idx >= 0) {
    order.splice(idx, 1)
    order.push(key)
  }
  return hit
}

export function setCachedMarkdownBody(key: string, body: ReactElement): void {
  if (cache.has(key)) {
    cache.set(key, body)
    const idx = order.indexOf(key)
    if (idx >= 0) {
      order.splice(idx, 1)
      order.push(key)
    }
    return
  }
  cache.set(key, body)
  order.push(key)
  while (order.length > MARKDOWN_CACHE_MAX) {
    const old = order.shift()
    if (old !== undefined) cache.delete(old)
  }
}
