/**
 * Task → FullCalendar event mapping (SPRINT-TASK-CALENDAR / TASK-221).
 * C1: only tasks with startDate and/or endDate. endDate = due day.
 * All-day events use exclusive end (FullCalendar convention).
 */

import type { Task } from './types'

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

export type CalendarEventInput = {
  id: string
  title: string
  start: string
  /** Exclusive end date (YYYY-MM-DD) for all-day ranges; omit for single-day */
  end?: string
  allDay: true
  extendedProps: { taskId: string }
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

/**
 * Map group tasks to FullCalendar event inputs.
 * Skips deleted and undated tasks.
 */
export function tasksToCalendarEvents(tasks: readonly Task[]): CalendarEventInput[] {
  const out: CalendarEventInput[] = []

  for (const task of tasks) {
    if (task.deletedAt) continue
    const hasStart = isYmd(task.startDate)
    const hasEnd = isYmd(task.endDate)
    if (!hasStart && !hasEnd) continue

    const startDate = hasStart ? task.startDate : undefined
    const endDate = hasEnd ? task.endDate : undefined

    let start: string
    let endExclusive: string

    if (startDate && endDate) {
      start = startDate
      endExclusive = endDate > startDate ? addOneDayYmd(endDate) : addOneDayYmd(startDate)
    } else if (endDate) {
      start = endDate
      endExclusive = addOneDayYmd(endDate)
    } else if (startDate) {
      start = startDate
      endExclusive = addOneDayYmd(startDate)
    } else {
      continue
    }

    out.push({
      id: task.taskId,
      title: task.title,
      start,
      end: endExclusive,
      allDay: true,
      extendedProps: { taskId: task.taskId }
    })
  }

  return out
}
