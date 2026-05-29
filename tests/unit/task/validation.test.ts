import { describe, expect, it } from 'vitest'
import { validateOtherReason } from '@shared/task/validation'

describe('validateOtherReason', () => {
  it('requires reason when status is other', () => {
    expect(validateOtherReason('other', '')).toBe('board.otherReasonRequired')
    expect(validateOtherReason('other', '   ')).toBe('board.otherReasonRequired')
  })

  it('accepts trimmed reason for other', () => {
    expect(validateOtherReason('other', ' blocked ')).toBeNull()
  })

  it('ignores non-other statuses', () => {
    expect(validateOtherReason('todo', undefined)).toBeNull()
    expect(validateOtherReason('done', null)).toBeNull()
  })
})
