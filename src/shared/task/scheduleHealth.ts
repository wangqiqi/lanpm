import type { Task } from './types'

/** none = 无排期/未开始/已完成；on_track = 进度达工期期望（绿） */
export type ScheduleHealth = 'none' | 'on_track' | 'behind' | 'overdue'

const DEFAULT_SPAN_DAYS = 7

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

/** 日历日差（含起止两日），如 1 号～4 号 = 4 天 */
export function diffDaysInclusive(start: Date, end: Date): number {
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.floor((b - a) / 86_400_000) + 1
}

export interface TaskScheduleWindow {
  startDate: string
  endDate: string
}

/** 用于进度健康度计算的起止日期（与甘特默认规则对齐） */
export function resolveTaskScheduleWindow(
  task: Pick<Task, 'startDate' | 'endDate' | 'milestone' | 'createdAt'>
): TaskScheduleWindow | null {
  if (task.milestone && task.endDate) {
    const d = task.endDate
    return { startDate: d, endDate: d }
  }
  if (task.startDate && task.endDate) {
    return { startDate: task.startDate, endDate: task.endDate }
  }
  if (task.endDate) {
    return { startDate: task.endDate, endDate: task.endDate }
  }
  if (task.startDate) {
    const start = parseYmd(task.startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + DEFAULT_SPAN_DAYS)
    return { startDate: task.startDate, endDate: formatYmd(end) }
  }
  return null
}

/**
 * 按工期应完成比例：elapsedDays / totalDays × 100（四舍五入）。
 * 例：4 天任务剩 1 天 → 已过 3 天 → 期望 75%。
 */
export function getExpectedProgressPercent(
  window: TaskScheduleWindow,
  refDate: Date = new Date()
): number | null {
  const start = parseYmd(window.startDate)
  let end = parseYmd(window.endDate)
  if (end < start) {
    end = new Date(start)
    end.setDate(end.getDate() + 1)
  }
  const today = startOfDay(refDate)
  if (today < start) return 0
  const totalDays = Math.max(1, diffDaysInclusive(start, end))
  const elapsedEnd = today > end ? end : today
  const elapsedDays = diffDaysInclusive(start, elapsedEnd)
  return Math.min(100, Math.round((elapsedDays / totalDays) * 100))
}

/**
 * - overdue：今日已过截止日期且未完成
 * - behind：实际进度低于按工期推算的期望进度
 * - on_track：有排期且进度达到或超过期望
 */
export function getTaskScheduleHealth(
  task: Pick<Task, 'startDate' | 'endDate' | 'progressPercent' | 'status' | 'milestone' | 'createdAt'>,
  refDate: Date = new Date()
): ScheduleHealth {
  if (task.status === 'done') return 'none'

  const window = resolveTaskScheduleWindow(task)
  if (!window) return 'none'

  const start = parseYmd(window.startDate)
  const end = parseYmd(window.endDate)
  const today = startOfDay(refDate)

  if (today < start) return 'none'

  if (today > end) return 'overdue'

  const expected = getExpectedProgressPercent(window, refDate)
  if (expected == null) return 'none'

  if (task.progressPercent < expected) return 'behind'
  return 'on_track'
}

/** 驾驶舱等聚合：延期 / 落后任务数（未完成） */
export function countScheduleHealth(
  tasks: Pick<Task, 'startDate' | 'endDate' | 'progressPercent' | 'status' | 'milestone' | 'createdAt' | 'deletedAt'>[],
  refDate?: Date
): { overdue: number; behind: number } {
  let overdue = 0
  let behind = 0
  for (const t of tasks) {
    if (t.deletedAt) continue
    const h = getTaskScheduleHealth(t, refDate)
    if (h === 'overdue') overdue += 1
    else if (h === 'behind') behind += 1
  }
  return { overdue, behind }
}

/** 甘特条：进度正常（绿） */
export const GANTT_ON_TRACK_BAR = {
  progressColor: '#34c759',
  progressSelectedColor: '#248a3d',
  backgroundSelectedColor: '#248a3d'
} as const

/** 甘特条：落后（深黄进度/选中描边） */
export const GANTT_BEHIND_BAR = {
  progressColor: '#c99700',
  progressSelectedColor: '#a67c00',
  backgroundSelectedColor: '#a67c00'
} as const

/** 甘特条：延期（深红底 + 白字，避免 #ffcccc 浅粉对比不足） */
export const GANTT_OVERDUE_BAR = {
  backgroundColor: '#d70015',
  backgroundSelectedColor: '#b50012',
  progressColor: '#ff3b30',
  progressSelectedColor: '#d70015'
} as const

export type GanttBarStyleSet = {
  backgroundColor?: string
  backgroundSelectedColor?: string
  progressColor?: string
  progressSelectedColor?: string
}

/** 族色条 + 工期健康色（延期覆盖族色；落后保留族色底、黄/绿进度） */
export function mergeGanttBarStyles(
  task: Pick<Task, 'startDate' | 'endDate' | 'progressPercent' | 'status' | 'milestone' | 'createdAt'>,
  familyBar: GanttBarStyleSet | undefined,
  refDate?: Date
): GanttBarStyleSet | undefined {
  const health = getTaskScheduleHealth(task, refDate)
  if (health === 'overdue') return { ...GANTT_OVERDUE_BAR }
  const base = familyBar ?? {
    backgroundColor: '#8e8e93',
    backgroundSelectedColor: '#6b7280',
    progressColor: '#6b7280',
    progressSelectedColor: '#4b5563'
  }
  if (health === 'behind') return { ...base, ...GANTT_BEHIND_BAR }
  if (health === 'on_track') return { ...base, ...GANTT_ON_TRACK_BAR }
  return familyBar
}
