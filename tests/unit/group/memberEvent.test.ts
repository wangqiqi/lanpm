import { describe, expect, it } from 'vitest'
import { isMemberEventPayload } from '../../../src/shared/group/memberEvent'

describe('isMemberEventPayload', () => {
  const valid = {
    action: 'dissolve' as const,
    groupId: 'g1',
    at: '2026-07-11T00:00:00.000Z',
    actorUserId: 'u1'
  }

  it('accepts dissolve payload', () => {
    expect(isMemberEventPayload(valid)).toBe(true)
  })

  it('accepts join/leave shape for future handlers', () => {
    expect(isMemberEventPayload({ ...valid, action: 'join' })).toBe(true)
    expect(isMemberEventPayload({ ...valid, action: 'leave' })).toBe(true)
  })

  it('rejects invalid payloads', () => {
    expect(isMemberEventPayload(null)).toBe(false)
    expect(isMemberEventPayload({ ...valid, action: 'kick' })).toBe(false)
    expect(isMemberEventPayload({ ...valid, groupId: '' })).toBe(false)
    expect(isMemberEventPayload({ ...valid, actorUserId: 1 })).toBe(false)
  })
})
