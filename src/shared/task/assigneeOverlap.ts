import type { Task } from './types.ts'

/** Distinct from baseline slip `#c2410c` and ahead `#0d9488`. */
export const SCHEDULE_OVERLAP_COLOR = '#7c3aed'

export type YmdRange = {
  startDate: string
  endDate: string
}

export function hasExplicitYmdSchedule(
  task: Pick<Task, 'startDate' | 'endDate'>
): task is Pick<Task, 'startDate' | 'endDate'> & YmdRange {
  return Boolean(task.startDate && task.endDate)
}

/** Inclusive calendar-day overlap on ISO `YYYY-MM-DD` strings. */
export function ymdRangesOverlap(a: YmdRange, b: YmdRange): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate
}

function eligibleForOverlap(task: Task): task is Task & YmdRange & { assigneeUserId: string } {
  if (task.deletedAt) return false
  if (!task.assigneeUserId) return false
  return hasExplicitYmdSchedule(task)
}

/** Task ids that share an assignee with another dated task on overlapping days. */
export function findAssigneeOverlapTaskIds(tasks: readonly Task[]): Set<string> {
  const rows = tasks.filter(eligibleForOverlap)
  const ids = new Set<string>()
  for (let i = 0; i < rows.length; i += 1) {
    const a = rows[i]!
    for (let j = i + 1; j < rows.length; j += 1) {
      const b = rows[j]!
      if (a.assigneeUserId !== b.assigneeUserId) continue
      if (
        !ymdRangesOverlap(
          { startDate: a.startDate, endDate: a.endDate },
          { startDate: b.startDate, endDate: b.endDate }
        )
      ) {
        continue
      }
      ids.add(a.taskId)
      ids.add(b.taskId)
    }
  }
  return ids
}

export function countAssigneeOverlapTasks(tasks: readonly Task[]): number {
  return findAssigneeOverlapTaskIds(tasks).size
}

export function barStylesForAssigneeOverlap<
  T extends {
    backgroundColor?: string
    backgroundSelectedColor?: string
    progressColor?: string
    progressSelectedColor?: string
  }
>(styles: T | undefined, overlapping: boolean): T | undefined {
  if (!overlapping) return styles
  return {
    ...styles,
    backgroundColor: SCHEDULE_OVERLAP_COLOR,
    backgroundSelectedColor: SCHEDULE_OVERLAP_COLOR,
    progressColor: SCHEDULE_OVERLAP_COLOR,
    progressSelectedColor: SCHEDULE_OVERLAP_COLOR
  } as T
}
