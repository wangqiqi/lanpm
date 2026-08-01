import { describe, expect, it } from 'vitest'
import { isImageFileName } from '../../../src/shared/chat/imageFile.ts'

describe('isImageFileName', () => {
  it('detects common image extensions', () => {
    expect(isImageFileName('shot.png')).toBe(true)
    expect(isImageFileName('photo.JPEG')).toBe(true)
    expect(isImageFileName('a.webp')).toBe(true)
  })

  it('rejects non-image names', () => {
    expect(isImageFileName('doc.pdf')).toBe(false)
    expect(isImageFileName('archive.zip')).toBe(false)
  })
})
