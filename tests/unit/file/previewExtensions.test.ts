import { describe, expect, it } from 'vitest'
import {
  isTextPreviewFile,
  supportsInlinePreview,
  TEXT_PREVIEW_EXTENSIONS
} from '@shared/file/previewExtensions'

describe('TEXT_PREVIEW_EXTENSIONS', () => {
  it('includes common text-like extensions', () => {
    for (const ext of ['yaml', 'yml', 'xml', 'ini', 'toml']) {
      expect(TEXT_PREVIEW_EXTENSIONS.has(ext)).toBe(true)
    }
  })
})

describe('isTextPreviewFile', () => {
  it('recognizes config and dotfiles', () => {
    expect(isTextPreviewFile('config.yaml', 'yaml')).toBe(true)
    expect(isTextPreviewFile('.env', 'bin')).toBe(true)
    expect(isTextPreviewFile('Dockerfile', 'bin')).toBe(true)
  })
})

describe('supportsInlinePreview', () => {
  it('allows raster/pdf inline preview', () => {
    expect(supportsInlinePreview({ name: 'a.png', ext: 'png' })).toBe(true)
    expect(supportsInlinePreview({ name: 'a.pdf', ext: 'pdf' })).toBe(true)
  })

  it('rejects office docs without conversion', () => {
    expect(supportsInlinePreview({ name: 'a.docx', ext: 'docx' })).toBe(false)
  })
})
