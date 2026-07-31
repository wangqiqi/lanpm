import { showDesktopNotification } from '../desktopNotification.ts'
import { listAllMeetingSchedulesForReminders } from './meetingScheduleStore.ts'
import { scanMeetingReminders } from '../../shared/media/meetingReminderLogic.ts'

const SCAN_INTERVAL_MS = 30_000

let timer: ReturnType<typeof setInterval> | null = null
const notifiedKeys = new Set<string>()

function formatReminderBody(title: string, startsAt: string): string {
  const when = new Date(startsAt)
  const time = Number.isNaN(when.getTime())
    ? startsAt
    : when.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
  return `${title} · ${time}`
}

function runScan(): void {
  const now = Date.now()
  const schedules = listAllMeetingSchedulesForReminders()
  const hits = scanMeetingReminders(schedules, now, notifiedKeys)

  for (const hit of hits) {
    notifiedKeys.add(hit.dedupeKey)
    const title =
      hit.kind === '5min'
        ? `会议将在 5 分钟后开始`
        : `会议现在开始`
    showDesktopNotification(title, formatReminderBody(hit.schedule.title, hit.schedule.startsAt))
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
