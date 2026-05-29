import { describe, expect, it } from 'vitest'
import { isMessageReadByOthers } from '@shared/chat/readReceipt'

describe('isMessageReadByOthers', () => {
  it('returns true when a non-sender has read', () => {
    expect(isMessageReadByOthers('alice', ['alice', 'bob'])).toBe(true)
  })

  it('returns false when only sender has read', () => {
    expect(isMessageReadByOthers('alice', ['alice'])).toBe(false)
  })

  it('returns false for empty readers', () => {
    expect(isMessageReadByOthers('alice', [])).toBe(false)
  })
})
