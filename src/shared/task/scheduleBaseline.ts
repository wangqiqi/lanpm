/** Per-group frozen Gantt dates (paid `lanpm.schedule`). One snapshot per group. */

export type ScheduleBaselineTask = {
  taskId: string
  startDate: string
  endDate: string
}

export type ScheduleBaselineSnapshot = {
  groupId: string
  frozenAt: string | null
  tasks: ScheduleBaselineTask[]
}

export type FreezeScheduleBaselineResult = {
  groupId: string
  frozenAt: string
  count: number
}

export type ScheduleBaselineVariance = 'none' | 'on-track' | 'slipped' | 'ahead'

export const SCHEDULE_BASELINE_SLIPPED_COLOR = '#c2410c'
export const SCHEDULE_BASELINE_AHEAD_COLOR = '#0d9488'

export function compareScheduleToBaseline(
  current: { startDate: string; endDate: string },
  baseline: ScheduleBaselineTask | undefined
): ScheduleBaselineVariance {
  if (!baseline) return 'none'
  if (current.endDate > baseline.endDate) return 'slipped'
  if (current.endDate < baseline.endDate) return 'ahead'
  return 'on-track'
}

export function countSlippedVsBaseline(
  currentById: Map<string, { startDate: string; endDate: string }>,
  snapshot: ScheduleBaselineSnapshot
): number {
  let n = 0
  for (const row of snapshot.tasks) {
    const cur = currentById.get(row.taskId)
    if (!cur) continue
    if (compareScheduleToBaseline(cur, row) === 'slipped') n += 1
  }
  return n
}

export function barStylesForBaselineVariance(
  styles: {
    backgroundColor?: string
    backgroundSelectedColor?: string
    progressColor?: string
    progressSelectedColor?: string
  } | undefined,
  variance: ScheduleBaselineVariance
): typeof styles {
  if (variance !== 'slipped' && variance !== 'ahead') return styles
  const color =
    variance === 'slipped' ? SCHEDULE_BASELINE_SLIPPED_COLOR : SCHEDULE_BASELINE_AHEAD_COLOR
  return {
    ...styles,
    backgroundColor: color,
    backgroundSelectedColor: color,
    progressColor: color,
    progressSelectedColor: color
  }
}
