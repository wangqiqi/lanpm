import { describe, expect, it } from 'vitest'
import {
  isDirectPreviewReady,
  isTextPreviewFile,
  supportsInlinePreview,
  TEXT_PREVIEW_EXTENSIONS,
  TEXT_PREVIEW_MAX_BYTES
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

  it('allows inline video preview', () => {
    expect(supportsInlinePreview({ name: 'clip.mp4', ext: 'mp4' })).toBe(true)
    expect(supportsInlinePreview({ name: 'clip.webm', ext: 'webm' })).toBe(true)
  })
})

describe('isDirectPreviewReady', () => {
  it('matches supportsInlinePreview', () => {
    const meta = { name: 'readme.md', ext: 'md' }
    expect(isDirectPreviewReady(meta)).toBe(supportsInlinePreview(meta))
  })
})

describe('TEXT_PREVIEW_MAX_BYTES', () => {
  it('caps text preview at 512 KiB', () => {
    expect(TEXT_PREVIEW_MAX_BYTES).toBe(512 * 1024)
  })
})
