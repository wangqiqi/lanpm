/**
 * Task → FullCalendar event mapping.
 * Dated tasks use startDate/endDate (endDate = due).
 * Undated tasks use the same default window as Gantt (`defaultScheduleForTask`)
 * so the calendar is not empty when the board has tasks without dates.
 * All-day events use exclusive end (FullCalendar convention).
 */

import { defaultScheduleForTask } from './ganttAdapter.ts'
import type { Task } from './types'

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

export type CalendarEventInput = {
  id: string
  title: string
  start: string
  /** Exclusive end date (YYYY-MM-DD) for all-day ranges */
  end: string
  allDay: true
  /** Soft style for inferred (no persisted dates) */
  classNames?: string[]
  extendedProps: { taskId: string; inferredSchedule: boolean }
}

function isYmd(value: string | undefined): value is string {
  return typeof value === 'string' && YMD_RE.test(value)
}

/** Add one calendar day to YYYY-MM-DD (UTC-safe via parts). */
export function addOneDayYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!))
  dt.setUTCDate(dt.getUTCDate() + 1)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Subtract one calendar day from YYYY-MM-DD (UTC-safe). */
export function subtractOneDayYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!))
  dt.setUTCDate(dt.getUTCDate() - 1)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/**
 * FullCalendar all-day drop/resize → inclusive Task dates for `updateSchedule`.
 * `endExclusiveYmd` is FC exclusive end; omit/null → single-day (start = end).
 * Returns null if inputs are invalid or inverted.
 */
export function scheduleFromCalendarExclusiveRange(
  startYmd: string,
  endExclusiveYmd?: string | null
): { startDate: string; endDate: string } | null {
  if (!isYmd(startYmd)) return null
  if (endExclusiveYmd == null || endExclusiveYmd === '') {
    return { startDate: startYmd, endDate: startYmd }
  }
  if (!isYmd(endExclusiveYmd)) return null
  // exclusive end must be strictly after start for a non-empty all-day range
  if (endExclusiveYmd <= startYmd) return null
  const endDate = subtractOneDayYmd(endExclusiveYmd)
  if (endDate < startYmd) return null
  return { startDate: startYmd, endDate }
}

/**
 * Map group tasks to FullCalendar event inputs.
 * Skips deleted only.
 */
export function tasksToCalendarEvents(tasks: readonly Task[]): CalendarEventInput[] {
  const out: CalendarEventInput[] = []

  for (const task of tasks) {
    if (task.deletedAt) continue
    const hasStart = isYmd(task.startDate)
    const hasEnd = isYmd(task.endDate)

    let start: string
    let endExclusive: string
    let inferredSchedule = false

    if (hasStart || hasEnd) {
      const startDate = hasStart ? task.startDate : undefined
      const endDate = hasEnd ? task.endDate : undefined
      if (startDate && endDate) {
        start = startDate
        endExclusive = endDate > startDate ? addOneDayYmd(endDate) : addOneDayYmd(startDate)
      } else if (endDate) {
        start = endDate
        endExclusive = addOneDayYmd(endDate)
      } else {
        start = startDate!
        endExclusive = addOneDayYmd(startDate!)
      }
    } else {
      const fallback = defaultScheduleForTask(task)
      start = fallback.startDate
      endExclusive = addOneDayYmd(fallback.endDate)
      inferredSchedule = true
    }

    out.push({
      id: task.taskId,
      title: task.title,
      start,
      end: endExclusive,
      allDay: true,
      ...(inferredSchedule ? { classNames: ['lanpm-cal-inferred'] } : {}),
      extendedProps: { taskId: task.taskId, inferredSchedule }
    })
  }

  return out
}
