import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import cpp from 'highlight.js/lib/languages/cpp'
import css from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import { toHighlightLanguage } from '@shared/chat/detectLanguage'
import { LruMap } from '@shared/util/bounded'

export const HIGHLIGHT_MAX_CHARS = 50_000
export const HIGHLIGHT_CACHE_MAX = 200

let registered = false
const highlightCache = new LruMap<string, string>(HIGHLIGHT_CACHE_MAX)

export function ensureHighlightLanguagesRegistered(): void {
  if (registered) return
  hljs.registerLanguage('bash', bash)
  hljs.registerLanguage('cpp', cpp)
  hljs.registerLanguage('css', css)
  hljs.registerLanguage('go', go)
  hljs.registerLanguage('java', java)
  hljs.registerLanguage('javascript', javascript)
  hljs.registerLanguage('json', json)
  hljs.registerLanguage('plaintext', plaintext)
  hljs.registerLanguage('python', python)
  hljs.registerLanguage('rust', rust)
  hljs.registerLanguage('sql', sql)
  hljs.registerLanguage('typescript', typescript)
  hljs.registerLanguage('xml', xml)
  registered = true
}

export function hashHighlightCode(text: string): string {
  let h = 0
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0
  }
  return `${h}:${text.length}`
}

export function escapeHighlightHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function makeHighlightCacheKey(code: string, language: string): string {
  ensureHighlightLanguagesRegistered()
  const lang = toHighlightLanguage(language)
  const effectiveLang = hljs.getLanguage(lang) ? lang : 'plaintext'
  return `${effectiveLang}:${hashHighlightCode(code)}`
}

export function getCachedHighlightHtml(key: string): string | undefined {
  return highlightCache.get(key)
}

export function setCachedHighlightHtml(key: string, html: string): void {
  highlightCache.set(key, html)
}

/** Sync highlight in current thread (main or worker). Uses thread-local LRU. */
export function highlightCodeInThread(code: string, language: string): string {
  ensureHighlightLanguagesRegistered()
  if (code.length > HIGHLIGHT_MAX_CHARS) {
    return `${escapeHighlightHtml(code.slice(0, HIGHLIGHT_MAX_CHARS))}…`
  }
  const key = makeHighlightCacheKey(code, language)
  const cached = highlightCache.get(key)
  if (cached !== undefined) return cached
  const lang = toHighlightLanguage(language)
  const effectiveLang = hljs.getLanguage(lang) ? lang : 'plaintext'
  const value = hljs.highlight(code, { language: effectiveLang }).value
  highlightCache.set(key, value)
  return value
}
