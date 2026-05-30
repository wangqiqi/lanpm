import type { ScheduleHealth } from './scheduleHealth'
import { getTaskScheduleHealth } from './scheduleHealth'
import type { Task } from './types'

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

/** 甘特条：延期（纯红） */
export const GANTT_OVERDUE_BAR = {
  backgroundColor: '#ffcccc',
  backgroundSelectedColor: '#ff0000',
  progressColor: '#ff0000',
  progressSelectedColor: '#d70015'
} as const

export type GanttBarStyleSet = {
  backgroundColor?: string
  backgroundSelectedColor?: string
  progressColor?: string
  progressSelectedColor?: string
}

/** 族色条 + 工期健康色（延期覆盖族色；落后保留族色底、黄进度） */
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

export function scheduleHealthForGanttTooltip(
  task: Pick<Task, 'startDate' | 'endDate' | 'progressPercent' | 'status' | 'milestone' | 'createdAt'>
): ScheduleHealth {
  return getTaskScheduleHealth(task)
}
