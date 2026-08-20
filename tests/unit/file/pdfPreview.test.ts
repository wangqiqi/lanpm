import { describe, expect, it } from 'vitest'
import {
  isPdfExtension,
  PDFJS_WORKER_PUBLIC_PATH,
  previewPathLooksLikePdf,
  shouldUsePdfJsPreview
} from '@shared/file/pdfPreview'

describe('pdfPreview helpers', () => {
  it('exposes the CSP-self worker path', () => {
    expect(PDFJS_WORKER_PUBLIC_PATH).toBe('/pdfjs/pdf.worker.min.mjs')
  })

  it('detects pdf extensions', () => {
    expect(isPdfExtension('pdf')).toBe(true)
    expect(isPdfExtension('.PDF')).toBe(true)
    expect(isPdfExtension('docx')).toBe(false)
  })

  it('detects converted preview paths', () => {
    expect(previewPathLooksLikePdf('/tmp/previews/a/Spec.pdf')).toBe(true)
    expect(previewPathLooksLikePdf('/tmp/file.bin')).toBe(false)
  })

  it('uses pdfjs for native pdf when a preview URL exists', () => {
    expect(
      shouldUsePdfJsPreview({
        ext: 'pdf',
        previewUrl: 'lanpm-preview://file/abc'
      })
    ).toBe(true)
  })

  it('uses pdfjs for office conversions that produced a pdf', () => {
    expect(
      shouldUsePdfJsPreview({
        ext: 'docx',
        previewPath: '/data/previews/id/doc.pdf',
        previewUrl: 'lanpm-preview://file/id'
      })
    ).toBe(true)
  })

  it('does not use pdfjs without a preview URL', () => {
    expect(shouldUsePdfJsPreview({ ext: 'pdf', previewUrl: null })).toBe(false)
  })
})
