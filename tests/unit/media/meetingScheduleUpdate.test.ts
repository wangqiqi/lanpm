import { describe, expect, it } from 'vitest'
import {
  applyMeetingScheduleUpdate,
  validateUpdateMeetingScheduleInput,
  type MeetingSchedule
} from '../../../src/shared/media/meetingSchedule'

const current: MeetingSchedule = {
  id: 's1',
  groupId: 'g1',
  title: 'Standup',
  startsAt: '2026-08-20T10:00:00.000Z',
  durationMinutes: 30,
  createdAt: '2026-08-19T08:00:00.000Z'
}

describe('validateUpdateMeetingScheduleInput', () => {
  it('rejects missing id or empty patch', () => {
    expect(validateUpdateMeetingScheduleInput({})).toBeNull()
    expect(validateUpdateMeetingScheduleInput({ id: 's1' })).toBeNull()
    expect(validateUpdateMeetingScheduleInput({ id: 's1', title: '  ' })).toBeNull()
  })

  it('accepts a title-only patch', () => {
    const patch = validateUpdateMeetingScheduleInput({ id: 's1', title: ' Retro ' })
    expect(patch).toEqual({ id: 's1', title: 'Retro' })
  })
})

describe('applyMeetingScheduleUpdate', () => {
  it('keeps groupId and createdAt', () => {
    const next = applyMeetingScheduleUpdate(current, {
      id: 's1',
      title: 'Retro',
      durationMinutes: 45
    })
    expect(next.groupId).toBe('g1')
    expect(next.createdAt).toBe(current.createdAt)
    expect(next.title).toBe('Retro')
    expect(next.durationMinutes).toBe(45)
    expect(next.startsAt).toBe(current.startsAt)
  })
})
