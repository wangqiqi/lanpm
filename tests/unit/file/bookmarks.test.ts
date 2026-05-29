import { describe, expect, it } from 'vitest'
import { exportBookmarkHtml, parseBookmarkHtml } from '@shared/file/bookmarks'

const sampleHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
<DT><A HREF="https://example.com">Example</A>
<DT><A HREF="https://foo.bar">Foo</A>
</DL>`

describe('parseBookmarkHtml', () => {
  it('extracts http links', () => {
    expect(parseBookmarkHtml(sampleHtml)).toEqual([
      { url: 'https://example.com', title: 'Example' },
      { url: 'https://foo.bar', title: 'Foo' }
    ])
  })

  it('deduplicates identical entries', () => {
    const dup = `${sampleHtml}\n<DT><A HREF="https://example.com">Example</A>`
    expect(parseBookmarkHtml(dup)).toHaveLength(2)
  })
})

describe('exportBookmarkHtml', () => {
  it('escapes html in output', () => {
    const entries = [{ url: 'https://a.test', title: 'A & B' }]
    const html = exportBookmarkHtml(entries, 'Test')
    expect(html).toContain('NETSCAPE-Bookmark-file-1')
    expect(html).toContain('A &amp; B')
    expect(parseBookmarkHtml(html)[0]?.url).toBe('https://a.test')
  })
})
