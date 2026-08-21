import { describe, expect, it } from 'vitest'
import {
  isOfficeLightExtension,
  previewPathLooksLikeHtml,
  sanitizeOfficeHtmlFragment,
  shouldUseOfficeLightPreview
} from '@shared/file/officeLightPreview'

describe('officeLightPreview helpers', () => {
  it('only treats docx and xlsx as light office', () => {
    expect(isOfficeLightExtension('docx')).toBe(true)
    expect(isOfficeLightExtension('.XLSX')).toBe(true)
    expect(isOfficeLightExtension('doc')).toBe(false)
    expect(isOfficeLightExtension('xls')).toBe(false)
    expect(isOfficeLightExtension('pptx')).toBe(false)
  })

  it('detects html preview paths', () => {
    expect(previewPathLooksLikeHtml('/data/previews/id/preview.html')).toBe(true)
    expect(previewPathLooksLikeHtml('/data/previews/id/doc.pdf')).toBe(false)
  })

  it('uses light preview for html fallback, not soffice pdf', () => {
    expect(
      shouldUseOfficeLightPreview({
        ext: 'docx',
        previewPath: '/data/previews/id/preview.html',
        previewUrl: 'lanpm-preview://file/id'
      })
    ).toBe(true)
    expect(
      shouldUseOfficeLightPreview({
        ext: 'docx',
        previewPath: '/data/previews/id/doc.pdf',
        previewUrl: 'lanpm-preview://file/id'
      })
    ).toBe(false)
  })

  it('strips script and event handlers from fragments', () => {
    const dirty = '<p onclick="alert(1)">ok</p><script>alert(2)</script>'
    const clean = sanitizeOfficeHtmlFragment(dirty)
    expect(clean).toContain('<p')
    expect(clean).not.toMatch(/script/i)
    expect(clean).not.toMatch(/onclick/i)
  })
})
