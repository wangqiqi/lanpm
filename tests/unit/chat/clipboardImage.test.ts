import { describe, expect, it } from 'vitest'
import { readClipboardImageFile } from '../../../src/shared/chat/clipboardImage.ts'

describe('readClipboardImageFile', () => {
  it('returns null when no image items', () => {
    const data = {
      files: [] as FileList,
      items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }] as unknown as DataTransferItemList
    } as DataTransfer
    expect(readClipboardImageFile(data)).toBeNull()
  })

  it('reads image from files list', () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    const data = {
      files: [file] as unknown as FileList,
      items: [] as DataTransferItemList
    } as DataTransfer
    expect(readClipboardImageFile(data)?.name).toBe('a.png')
  })
})
