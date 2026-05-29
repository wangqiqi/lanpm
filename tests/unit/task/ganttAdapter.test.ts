import { describe, expect, it } from 'vitest'
import {
  defaultScheduleForTask,
  ganttDatesToYmd,
  tasksToGanttBars
} from '@shared/task/ganttAdapter'
import type { Task } from '@shared/task/types'
import type { TaskDependency } from '@shared/task/dependency'

function task(partial: Partial<Task> & Pick<Task, 'taskId'>): Task {
  return {
    groupId: 'g1',
    title: partial.title ?? partial.taskId,
    status: 'todo',
    priority: 'medium',
    progressPercent: partial.progressPercent ?? 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    ...partial
  }
}

describe('defaultScheduleForTask', () => {
  it('keeps explicit dates', () => {
    expect(
      defaultScheduleForTask(
        task({ taskId: 't1', startDate: '2026-02-01', endDate: '2026-02-10' })
      )
    ).toEqual({ startDate: '2026-02-01', endDate: '2026-02-10' })
  })

  it('defaults to 7-day span from createdAt', () => {
    const schedule = defaultScheduleForTask(task({ taskId: 't1' }))
    expect(schedule.startDate).toBe('2026-01-15')
    expect(schedule.endDate).toBe('2026-01-22')
  })
})

describe('tasksToGanttBars', () => {
  it('maps FS dependencies to gantt dependencies', () => {
    const tasks = [task({ taskId: 'a' }), task({ taskId: 'b' })]
    const deps: TaskDependency[] = [{ fromTaskId: 'a', toTaskId: 'b', type: 'FS' }]
    const bars = tasksToGanttBars(tasks, deps)
    expect(bars.find((b) => b.id === 'b')?.dependencies).toEqual(['a'])
  })

  it('marks milestone bars', () => {
    const bars = tasksToGanttBars([task({ taskId: 'm1', milestone: true, title: 'Ship' })], [])
    expect(bars[0]?.type).toBe('milestone')
    expect(bars[0]?.name).toBe('◆ Ship')
  })

  it('skips deleted tasks', () => {
    const bars = tasksToGanttBars(
      [task({ taskId: 'gone', deletedAt: '2026-01-16T00:00:00.000Z' })],
      []
    )
    expect(bars).toHaveLength(0)
  })
})

describe('ganttDatesToYmd', () => {
  it('uses same date for milestones', () => {
    const start = new Date(2026, 0, 15)
    expect(ganttDatesToYmd(start, start, true)).toEqual({
      startDate: '2026-01-15',
      endDate: '2026-01-15'
    })
  })
})
