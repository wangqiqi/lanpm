/** 浏览器 Netscape 书签 HTML 解析与导出（M4-08） */
export interface BookmarkEntry {
  url: string
  title: string
}

const LINK_RE = /<A[^>]+HREF=["']([^"']+)["'][^>]*>([^<]*)<\/A>/gi

export function parseBookmarkHtml(html: string): BookmarkEntry[] {
  const results: BookmarkEntry[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null
  LINK_RE.lastIndex = 0
  while ((match = LINK_RE.exec(html)) !== null) {
    const url = match[1]?.trim()
    const title = (match[2]?.trim() || url) ?? ''
    if (!url || !url.startsWith('http')) continue
    const key = `${url}\0${title}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push({ url, title: title || url })
  }
  return results
}

export function exportBookmarkHtml(entries: BookmarkEntry[], title = 'LanPM Bookmarks'): string {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    `<TITLE>${escapeHtml(title)}</TITLE>`,
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    ...entries.map(
      (e) =>
        `    <DT><A HREF="${escapeAttr(e.url)}">${escapeHtml(e.title || e.url)}</A>`
    ),
    '</DL><p>'
  ]
  return lines.join('\n')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}
