import { describe, expect, it } from 'vitest'
import { isPinnedToBottom } from '@shared/chat/scrollPin'

describe('useNewMessageScroll helpers', () => {
  it('isPinnedToBottom when within threshold', () => {
    const el = {
      scrollHeight: 1000,
      scrollTop: 952,
      clientHeight: 48
    } as HTMLElement
    expect(isPinnedToBottom(el)).toBe(true)
  })

  it('not pinned when scrolled up', () => {
    const el = {
      scrollHeight: 1000,
      scrollTop: 100,
      clientHeight: 48
    } as HTMLElement
    expect(isPinnedToBottom(el)).toBe(false)
  })
})
