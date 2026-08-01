import { describe, expect, it } from 'vitest'
import {
  escapeHighlightHtml,
  highlightCodeInThread,
  makeHighlightCacheKey
} from '@renderer/features/chat/highlightCore'
import { highlightCode, highlightCodeAsync } from '@renderer/features/chat/highlightSetup'

describe('highlightCore', () => {
  it('highlights javascript', () => {
    const html = highlightCodeInThread('const x = 1', 'javascript')
    expect(html).toContain('hljs')
    expect(html).toContain('x')
  })

  it('uses plaintext for unknown language', () => {
    const html = highlightCodeInThread('plain text', 'not-a-lang')
    expect(html).toContain('plain')
  })

  it('truncates very long code', () => {
    const long = 'a'.repeat(60_000)
    const html = highlightCodeInThread(long, 'plaintext')
    expect(html.endsWith('…')).toBe(true)
    expect(html.length).toBeLessThan(long.length)
  })

  it('cache key is stable for same input', () => {
    const a = makeHighlightCacheKey('fn main() {}', 'rust')
    const b = makeHighlightCacheKey('fn main() {}', 'rust')
    expect(a).toBe(b)
  })

  it('escapeHighlightHtml escapes angle brackets', () => {
    expect(escapeHighlightHtml('<b>')).toBe('&lt;b&gt;')
  })
})

describe('highlightSetup', () => {
  it('highlightCode matches in-thread path', () => {
    const code = 'SELECT 1'
    expect(highlightCode(code, 'sql')).toBe(highlightCodeInThread(code, 'sql'))
  })

  it('highlightCodeAsync resolves from cache without worker in node', async () => {
    const code = 'package main'
    const first = await highlightCodeAsync(code, 'go')
    const second = await highlightCodeAsync(code, 'go')
    expect(second).toBe(first)
  })

  it('highlightCodeAsync rejects when aborted before start', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(highlightCodeAsync('x', 'plaintext', controller.signal)).rejects.toMatchObject({
      name: 'AbortError'
    })
  })
})
