import { showDesktopNotification } from '../desktopNotification.ts'
import { readAppLocale } from '../locale/localeStore.ts'
import { listAllMeetingSchedulesForReminders } from './meetingScheduleStore.ts'
import { scanMeetingReminders } from '../../shared/media/meetingReminderLogic.ts'
import {
  formatMeetingReminderWhen,
  meetingReminderBody,
  meetingReminderTitle
} from '../../shared/media/meetingReminderCopy.ts'

const SCAN_INTERVAL_MS = 30_000

let timer: ReturnType<typeof setInterval> | null = null
const notifiedKeys = new Set<string>()

function runScan(): void {
  const now = Date.now()
  const locale = readAppLocale()
  const schedules = listAllMeetingSchedulesForReminders()
  const hits = scanMeetingReminders(schedules, now, notifiedKeys)

  for (const hit of hits) {
    notifiedKeys.add(hit.dedupeKey)
    const title = meetingReminderTitle(hit.kind, locale)
    const whenLabel = formatMeetingReminderWhen(hit.schedule.startsAt, locale)
    const body = meetingReminderBody(hit.schedule.title, whenLabel, locale)
    showDesktopNotification(title, body, { groupId: hit.schedule.groupId })
  }
}

export function initMeetingReminderService(): void {
  if (timer) return
  runScan()
  timer = setInterval(runScan, SCAN_INTERVAL_MS)
}

export function shutdownMeetingReminderService(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/** 测试 / 重置 */
export function resetMeetingReminderDedupeForTests(): void {
  notifiedKeys.clear()
}
