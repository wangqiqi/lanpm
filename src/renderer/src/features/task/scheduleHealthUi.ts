import type { ScheduleHealth } from '@shared/task/scheduleHealth'
import {
  getExpectedProgressPercent,
  getTaskScheduleHealth,
  resolveTaskScheduleWindow
} from '@shared/task/scheduleHealth'
import type { Task, TaskStatus } from '@shared/task/types'
import type { MessageKey } from '@renderer/i18n/messages'
import scheduleStyles from '@renderer/styles/scheduleHealth.module.css'

export const SCHEDULE_ON_TRACK_STROKE = 'var(--lanpm-success)'
export const SCHEDULE_BEHIND_STROKE = 'var(--lanpm-warning)'
export const SCHEDULE_OVERDUE_STROKE = 'var(--lanpm-danger)'

export interface TaskScheduleEvaluation {
  health: ScheduleHealth
  expectedPercent: number | null
}

export function evaluateTaskSchedule(
  task: Pick<Task, 'startDate' | 'endDate' | 'progressPercent' | 'status' | 'milestone' | 'createdAt'>,
  refDate?: Date
): TaskScheduleEvaluation {
  const health = getTaskScheduleHealth(task, refDate)
  const window = resolveTaskScheduleWindow(task)
  const expectedPercent =
    window && health !== 'none' ? getExpectedProgressPercent(window, refDate) : null
  return { health, expectedPercent }
}

export function scheduleHealthHintKey(health: ScheduleHealth): MessageKey | null {
  if (health === 'overdue') return 'board.scheduleOverdueHint'
  if (health === 'behind') return 'board.scheduleBehindHint'
  if (health === 'on_track') return 'board.scheduleOnTrackHint'
  return null
}

export function kanbanScheduleBadgeKey(health: ScheduleHealth): MessageKey | null {
  if (health === 'overdue') return 'board.scheduleOverdueBadge'
  if (health === 'behind') return 'board.scheduleBehindBadge'
  return null
}

export function scheduleHealthAlertKey(health: ScheduleHealth): MessageKey | null {
  if (health === 'overdue') return 'task.scheduleAlertOverdue'
  if (health === 'behind') return 'task.scheduleAlertBehind'
  return null
}

export function kanbanCardScheduleClasses(health: ScheduleHealth): string[] {
  if (health === 'overdue') return [scheduleStyles.cardOverdue]
  if (health === 'behind') return [scheduleStyles.cardBehind]
  if (health === 'on_track') return [scheduleStyles.cardOnTrack]
  return []
}

export function kanbanDueScheduleClass(health: ScheduleHealth): string | undefined {
  if (health === 'overdue') return scheduleStyles.dueOverdue
  if (health === 'behind') return scheduleStyles.dueBehind
  if (health === 'on_track') return scheduleStyles.dueOnTrack
  return undefined
}

export function kanbanProgressScheduleClass(health: ScheduleHealth): string | undefined {
  if (health === 'overdue') return scheduleStyles.progressOverdue
  if (health === 'behind') return scheduleStyles.progressBehind
  if (health === 'on_track') return scheduleStyles.progressOnTrack
  return undefined
}

export function treeRowScheduleClass(health: ScheduleHealth): string | undefined {
  if (health === 'overdue') return scheduleStyles.treeRowOverdue
  if (health === 'behind') return scheduleStyles.treeRowBehind
  if (health === 'on_track') return scheduleStyles.treeRowOnTrack
  return undefined
}

export function treeProgressScheduleProps(
  health: ScheduleHealth,
  status: TaskStatus
): { status: 'success' | 'exception' | 'active'; strokeColor?: string } {
  if (status === 'done') return { status: 'success' }
  if (health === 'overdue') return { status: 'exception' }
  if (health === 'behind') return { status: 'active', strokeColor: SCHEDULE_BEHIND_STROKE }
  if (health === 'on_track') return { status: 'success', strokeColor: SCHEDULE_ON_TRACK_STROKE }
  return { status: 'active' }
}

export function shouldShowScheduleHealthVisual(health: ScheduleHealth): boolean {
  return health === 'on_track' || health === 'behind' || health === 'overdue'
}
