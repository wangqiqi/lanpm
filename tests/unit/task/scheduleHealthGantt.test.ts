import { describe, expect, it } from 'vitest'
import { LANPM_ACCENT } from '@shared/design/lanpmDesignTokens'
import {
  countScheduleHealth,
  mergeGanttBarStyles,
  GANTT_OVERDUE_BAR
} from '@shared/task/scheduleHealth'
import type { Task } from '@shared/task/types'

function task(partial: Partial<Task> & Pick<Task, 'taskId' | 'title'>): Task {
  return {
    groupId: 'g1',
    status: 'doing',
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: 't',
    updatedAt: 't',
    ...partial
  }
}

const jan3 = new Date(2026, 0, 3)
const jan5 = new Date(2026, 0, 5)

const baseBarStyles = {
  backgroundColor: LANPM_ACCENT.light,
  backgroundSelectedColor: LANPM_ACCENT.light,
  progressColor: LANPM_ACCENT.light,
  progressSelectedColor: LANPM_ACCENT.light
}

describe('scheduleHealth gantt styles', () => {
  it('applies overdue bar color', () => {
    const overdueStyles = mergeGanttBarStyles(
      task({
        taskId: 't1',
        title: 'Late',
        endDate: '2026-01-04',
        progressPercent: 10
      }),
      baseBarStyles,
      jan5
    )
    expect(overdueStyles?.backgroundColor).toBe(GANTT_OVERDUE_BAR.backgroundColor)
  })

  it('applies behind progress color while keeping family background', () => {
    const behindStyles = mergeGanttBarStyles(
      task({
        taskId: 't2',
        title: 'Behind',
        startDate: '2026-01-01',
        endDate: '2026-01-04',
        progressPercent: 25
      }),
      baseBarStyles,
      jan3
    )
    expect(behindStyles?.progressColor).toBe('#c99700')
    expect(behindStyles?.backgroundColor).toBe(LANPM_ACCENT.light)
  })

  it('applies on-track progress color', () => {
    const onTrackStyles = mergeGanttBarStyles(
      task({
        taskId: 't3',
        title: 'OK',
        startDate: '2026-01-01',
        endDate: '2026-01-04',
        progressPercent: 80
      }),
      baseBarStyles,
      jan3
    )
    expect(onTrackStyles?.progressColor).toBe('#34c759')
  })

  it('counts schedule health across tasks', () => {
    const counts = countScheduleHealth(
      [
        task({ taskId: 'a', title: 'A', endDate: '2026-01-04', progressPercent: 0 }),
        task({
          taskId: 'b',
          title: 'B',
          startDate: '2026-01-01',
          endDate: '2026-01-04',
          progressPercent: 25
        })
      ],
      jan5
    )
    expect(counts.overdue).toBe(2)
    expect(counts.behind).toBe(0)
  })
})
