import type { TaskStatus } from '../task/types'
import type { WeeklyTrend } from './types'
import { endOfIsoWeek, startOfIsoWeek } from './executiveSummary'

export type { WeeklyTrend }

export interface WeeklyTrendTaskInput {
  status: TaskStatus
  updatedAt: string
  milestone?: boolean
  deletedAt?: string
}

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function toDay(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

function isDayInRange(day: Date, start: Date, end: Date): boolean {
  const t = toDay(day)
  return t >= toDay(start) && t <= toDay(end)
}

function isCompletedInWeek(updatedAt: string, weekStart: Date): boolean {
  const parsed = new Date(updatedAt)
  if (Number.isNaN(parsed.getTime())) return false
  const weekEnd = endOfIsoWeek(weekStart)
  return isDayInRange(startOfDay(parsed), weekStart, weekEnd)
}

export function formatWeekOverWeekDelta(delta: number): string {
  if (delta > 0) return `+${delta}`
  return String(delta)
}

export function buildWeeklyTrend(
  tasks: WeeklyTrendTaskInput[],
  refDate: Date = new Date()
): WeeklyTrend {
  const active = tasks.filter((t) => !t.deletedAt)
  const thisWeekStart = startOfIsoWeek(refDate)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(thisWeekStart.getDate() - 7)

  let completedThisWeek = 0
  let completedLastWeek = 0
  let milestonesCompletedThisWeek = 0
  let milestonesCompletedLastWeek = 0

  for (const task of active) {
    if (task.status !== 'done') continue
    const inThisWeek = isCompletedInWeek(task.updatedAt, thisWeekStart)
    const inLastWeek = isCompletedInWeek(task.updatedAt, lastWeekStart)
    if (inThisWeek) {
      completedThisWeek += 1
      if (task.milestone) milestonesCompletedThisWeek += 1
    }
    if (inLastWeek) {
      completedLastWeek += 1
      if (task.milestone) milestonesCompletedLastWeek += 1
    }
  }

  return {
    completedThisWeek,
    completedLastWeek,
    weekOverWeekDelta: completedThisWeek - completedLastWeek,
    milestonesCompletedThisWeek,
    milestonesCompletedLastWeek
  }
}
