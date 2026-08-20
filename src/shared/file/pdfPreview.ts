export const PDFJS_WORKER_PUBLIC_PATH = '/pdfjs/pdf.worker.min.mjs'

export function isPdfExtension(ext: string): boolean {
  return ext.trim().toLowerCase().replace(/^\./, '') === 'pdf'
}

export function previewPathLooksLikePdf(previewPath: string | undefined | null): boolean {
  if (!previewPath) return false
  const base = previewPath.split(/[?#]/)[0] ?? ''
  return base.toLowerCase().endsWith('.pdf')
}

/** Native .pdf, or LibreOffice conversion whose preview file is a PDF. */
export function shouldUsePdfJsPreview(input: {
  ext: string
  previewPath?: string | null
  previewUrl?: string | null
}): boolean {
  if (!input.previewUrl) return false
  if (isPdfExtension(input.ext)) return true
  return previewPathLooksLikePdf(input.previewPath)
}
