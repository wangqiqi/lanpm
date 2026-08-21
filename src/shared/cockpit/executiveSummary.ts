import type { TaskStatus } from '../task/types'
import type { ExecutiveSummary } from './types'

export type { ExecutiveSummary }

export interface ExecutiveSummaryTaskInput {
  status: TaskStatus
  updatedAt: string
  endDate?: string
  deletedAt?: string
}

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

/** ISO 周一起始（本地时区） */
export function startOfIsoWeek(ref: Date): Date {
  const day = ref.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(ref)
  monday.setDate(ref.getDate() + diff)
  return startOfDay(monday)
}

export function endOfIsoWeek(weekStart: Date): Date {
  const end = new Date(weekStart)
  end.setDate(weekStart.getDate() + 6)
  return startOfDay(end)
}

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || !mo || !d) return null
  return startOfDay(new Date(y, mo - 1, d))
}

function toDay(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

function isDayInRange(day: Date, start: Date, end: Date): boolean {
  const t = toDay(day)
  return t >= toDay(start) && t <= toDay(end)
}

function isUpdatedThisWeek(updatedAt: string, ref: Date): boolean {
  const parsed = new Date(updatedAt)
  if (Number.isNaN(parsed.getTime())) return false
  const weekStart = startOfIsoWeek(ref)
  const weekEnd = endOfIsoWeek(weekStart)
  return isDayInRange(startOfDay(parsed), weekStart, weekEnd)
}

function isDueNextWeek(endDate: string | undefined, ref: Date): boolean {
  const due = endDate ? parseYmd(endDate) : null
  if (!due) return false
  const nextWeekStart = new Date(startOfIsoWeek(ref))
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const nextWeekEnd = endOfIsoWeek(nextWeekStart)
  return isDayInRange(due, nextWeekStart, nextWeekEnd)
}

/** Open-task due date falls in the next ISO week (Mon–Sun after this week). */
export function taskDueNextIsoWeek(endDate: string | undefined, ref: Date = new Date()): boolean {
  return isDueNextWeek(endDate, ref)
}

export function buildExecutiveSummary(
  tasks: ExecutiveSummaryTaskInput[],
  riskProjectCount: number,
  refDate: Date = new Date()
): ExecutiveSummary {
  const active = tasks.filter((t) => !t.deletedAt)
  const open = active.filter((t) => t.status !== 'done')

  let completedThisWeek = 0
  for (const task of active) {
    if (task.status === 'done' && isUpdatedThisWeek(task.updatedAt, refDate)) {
      completedThisWeek += 1
    }
  }

  const inProgressCount = open.filter((t) => t.status === 'doing' || t.status === 'todo').length

  let dueNextWeek = 0
  for (const task of open) {
    if (isDueNextWeek(task.endDate, refDate)) dueNextWeek += 1
  }

  return {
    completedThisWeek,
    inProgressCount,
    riskProjectCount,
    dueNextWeek
  }
}
