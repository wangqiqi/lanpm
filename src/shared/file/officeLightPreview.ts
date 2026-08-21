import { previewPathLooksLikePdf } from './pdfPreview.ts'

export const OFFICE_LIGHT_EXTENSIONS = new Set(['docx', 'xlsx'])

export function isOfficeLightExtension(ext: string): boolean {
  return OFFICE_LIGHT_EXTENSIONS.has(ext.trim().toLowerCase().replace(/^\./, ''))
}

export function previewPathLooksLikeHtml(previewPath: string | undefined | null): boolean {
  if (!previewPath) return false
  const base = previewPath.split(/[?#]/)[0] ?? ''
  return base.toLowerCase().endsWith('.html')
}

/** docx/xlsx light HTML from mammoth/exceljs — not LibreOffice PDF. */
export function shouldUseOfficeLightPreview(input: {
  ext: string
  previewPath?: string | null
  previewUrl?: string | null
}): boolean {
  if (!input.previewUrl) return false
  if (!isOfficeLightExtension(input.ext)) return false
  if (previewPathLooksLikePdf(input.previewPath)) return false
  return previewPathLooksLikeHtml(input.previewPath)
}

export function sanitizeOfficeHtmlFragment(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

export function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
