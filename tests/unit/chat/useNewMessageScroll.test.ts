import { describe, expect, it } from 'vitest'
import { isPinnedToBottom } from '@shared/chat/scrollPin'
import {
  classifyMessageCountIncrease,
  shouldScrollToBottomOnInitialLoad
} from '@shared/chat/scrollMemory'

describe('useNewMessageScroll helpers', () => {
  it('classifyMessageCountIncrease: initial load scrolls to bottom', () => {
    expect(classifyMessageCountIncrease(0, 42, 0)).toBe('initial')
  })

  it('classifyMessageCountIncrease: prepend when near top with existing messages', () => {
    expect(classifyMessageCountIncrease(50, 20, 0)).toBe('prepend')
    expect(classifyMessageCountIncrease(50, 20, 80)).toBe('prepend')
  })

  it('classifyMessageCountIncrease: append when scrolled down', () => {
    expect(classifyMessageCountIncrease(50, 1, 200)).toBe('append')
  })

  it('shouldScrollToBottomOnInitialLoad', () => {
    expect(shouldScrollToBottomOnInitialLoad(undefined)).toBe(true)
    expect(shouldScrollToBottomOnInitialLoad({ pinned: true })).toBe(true)
    expect(shouldScrollToBottomOnInitialLoad({ pinned: false, anchorMsgId: 'm1' })).toBe(false)
    expect(shouldScrollToBottomOnInitialLoad({ pinned: false })).toBe(true)
  })

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
