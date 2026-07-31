import { describe, expect, it } from 'vitest'
import {
  meetingReminderDedupeKey,
  scanMeetingReminders,
  type MeetingReminderHit
} from '../../../src/shared/media/meetingReminderLogic'
import type { MeetingSchedule } from '../../../src/shared/media/meetingSchedule'

function schedule(id: string, startsAt: string): MeetingSchedule {
  return {
    id,
    groupId: 'g1',
    title: `Meeting ${id}`,
    startsAt,
    durationMinutes: 30,
    createdAt: '2026-08-01T08:00:00.000Z'
  }
}

describe('scanMeetingReminders', () => {
  it('fires 5min and start reminders within window', () => {
    const start = new Date('2026-08-01T10:00:00.000Z')
    const fiveMinBefore = start.getTime() - 5 * 60 * 1000 + 30_000
    const atStart = start.getTime() + 10_000

    const s = schedule('a', start.toISOString())
    const notified = new Set<string>()

    const fiveMinHits = scanMeetingReminders([s], fiveMinBefore, notified)
    expect(fiveMinHits).toHaveLength(1)
    expect(fiveMinHits[0]?.kind).toBe('5min')
    fiveMinHits.forEach((h: MeetingReminderHit) => notified.add(h.dedupeKey))

    const startHits = scanMeetingReminders([s], atStart, notified)
    expect(startHits).toHaveLength(1)
    expect(startHits[0]?.kind).toBe('start')
  })

  it('dedupes repeated scans', () => {
    const start = new Date('2026-08-01T10:00:00.000Z')
    const s = schedule('b', start.toISOString())
    const now = start.getTime() - 5 * 60 * 1000 + 5_000
    const notified = new Set([meetingReminderDedupeKey('b', '5min')])

    expect(scanMeetingReminders([s], now, notified)).toHaveLength(0)
  })
})
