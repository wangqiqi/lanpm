import type { MeetingSchedule } from './meetingSchedule.ts'

export const MEETING_REMINDER_LEAD_MS = 5 * 60 * 1000
export const MEETING_REMINDER_WINDOW_MS = 60 * 1000

export type MeetingReminderKind = '5min' | 'start'

export interface MeetingReminderHit {
  schedule: MeetingSchedule
  kind: MeetingReminderKind
  dedupeKey: string
}

export function meetingReminderDedupeKey(scheduleId: string, kind: MeetingReminderKind): string {
  return `remind:${scheduleId}:${kind}`
}

/** 返回当前窗口内应触发的提醒（不含已 dedupe 的 key）。 */
export function scanMeetingReminders(
  schedules: MeetingSchedule[],
  nowMs: number,
  alreadyNotified: ReadonlySet<string>
): MeetingReminderHit[] {
  const hits: MeetingReminderHit[] = []

  for (const schedule of schedules) {
    const startMs = Date.parse(schedule.startsAt)
    if (Number.isNaN(startMs)) continue

    const fiveMinMs = startMs - MEETING_REMINDER_LEAD_MS
    if (nowMs >= fiveMinMs && nowMs < fiveMinMs + MEETING_REMINDER_WINDOW_MS) {
      const key = meetingReminderDedupeKey(schedule.id, '5min')
      if (!alreadyNotified.has(key)) {
        hits.push({ schedule, kind: '5min', dedupeKey: key })
      }
    }

    if (nowMs >= startMs && nowMs < startMs + MEETING_REMINDER_WINDOW_MS) {
      const key = meetingReminderDedupeKey(schedule.id, 'start')
      if (!alreadyNotified.has(key)) {
        hits.push({ schedule, kind: 'start', dedupeKey: key })
      }
    }
  }

  return hits
}
