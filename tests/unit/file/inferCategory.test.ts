import { describe, expect, it } from 'vitest'
import { inferCategory } from '@shared/file/types'

describe('inferCategory', () => {
  it('classifies by extension', () => {
    expect(inferCategory('png')).toBe('image')
    expect(inferCategory('mp4')).toBe('video')
    expect(inferCategory('ts')).toBe('code')
    expect(inferCategory('pdf')).toBe('document')
  })

  it('uses mime when extension is ambiguous', () => {
    expect(inferCategory('bin', 'image/png')).toBe('image')
    expect(inferCategory('bin', 'video/mp4')).toBe('video')
  })

  it('returns other for unknown types', () => {
    expect(inferCategory('xyz')).toBe('other')
  })
})
