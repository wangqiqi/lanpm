import { describe, expect, it } from 'vitest'
import {
  isJoinRequestDecisionPayload,
  isJoinRequestPayload
} from '@shared/group/joinRequest'

describe('joinRequest payloads', () => {
  it('accepts valid request and decision payloads', () => {
    expect(
      isJoinRequestPayload({
        requestId: 'r1',
        groupId: 'g1',
        groupName: 'Demo',
        ownerUserId: 'o1',
        applicantUserId: 'a1',
        applicantDisplayName: 'Alice',
        at: '2026-07-31T00:00:00.000Z'
      })
    ).toBe(true)
    expect(
      isJoinRequestDecisionPayload({
        requestId: 'r1',
        groupId: 'g1',
        applicantUserId: 'a1',
        approved: true,
        at: '2026-07-31T00:00:00.000Z',
        actorUserId: 'o1'
      })
    ).toBe(true)
  })

  it('rejects invalid shapes', () => {
    expect(isJoinRequestPayload(null)).toBe(false)
    expect(isJoinRequestPayload({ requestId: 1 })).toBe(false)
    expect(isJoinRequestDecisionPayload('x')).toBe(false)
    expect(
      isJoinRequestDecisionPayload({
        requestId: 'r1',
        groupId: 'g1',
        applicantUserId: 'a1',
        approved: 'yes',
        at: 't',
        actorUserId: 'o1'
      })
    ).toBe(false)
  })
})
