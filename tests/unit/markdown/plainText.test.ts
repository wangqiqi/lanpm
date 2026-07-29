import { describe, expect, it } from 'vitest'
import { markdownToPlainText } from '@shared/markdown/plainText'

describe('markdownToPlainText', () => {
  it('strips bold and headings', () => {
    const input = '## Title\n\n**bold** item'
    expect(markdownToPlainText(input)).toBe('Title\n\nbold item')
  })

  it('keeps fenced code body without fences', () => {
    const input = 'before\n```ts\nconst x = 1\n```\nafter'
    expect(markdownToPlainText(input)).toBe('before\nconst x = 1\nafter')
  })

  it('unwraps links and inline code', () => {
    const input = 'see [`docs`](https://example.com) and `code`'
    expect(markdownToPlainText(input)).toBe('see docs and code')
  })
})
