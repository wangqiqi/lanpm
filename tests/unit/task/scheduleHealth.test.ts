import { describe, expect, it } from 'vitest'
import {
  diffDaysInclusive,
  getExpectedProgressPercent,
  getTaskScheduleHealth,
  resolveTaskScheduleWindow
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

describe('scheduleHealth', () => {
  it('counts inclusive day span', () => {
    expect(diffDaysInclusive(new Date(2026, 0, 1), new Date(2026, 0, 4))).toBe(4)
  })

  it('computes expected progress percent', () => {
    const fourDay = { startDate: '2026-01-01', endDate: '2026-01-04' }
    expect(getExpectedProgressPercent(fourDay, jan3)).toBe(75)
  })

  it('marks behind schedule', () => {
    const behindTask = task({
      taskId: 't1',
      title: 'Behind',
      startDate: '2026-01-01',
      endDate: '2026-01-04',
      progressPercent: 25
    })
    expect(getTaskScheduleHealth(behindTask, jan3)).toBe('behind')
  })

  it('marks on track', () => {
    const behindTask = task({
      taskId: 't1',
      title: 'Behind',
      startDate: '2026-01-01',
      endDate: '2026-01-04',
      progressPercent: 25
    })
    const onTrack = task({ ...behindTask, progressPercent: 80 })
    expect(getTaskScheduleHealth(onTrack, jan3)).toBe('on_track')
  })

  it('returns none for not-yet-started tasks', () => {
    const notStarted = task({
      taskId: 't0',
      title: 'Future',
      startDate: '2026-01-10',
      endDate: '2026-01-14',
      progressPercent: 0
    })
    expect(getTaskScheduleHealth(notStarted, jan3)).toBe('none')
  })

  it('marks overdue', () => {
    const overdue = task({
      taskId: 't2',
      title: 'Late',
      endDate: '2026-01-04',
      progressPercent: 10
    })
    expect(getTaskScheduleHealth(overdue, jan5)).toBe('overdue')
  })

  it('returns none for completed tasks', () => {
    const overdue = task({
      taskId: 't2',
      title: 'Late',
      endDate: '2026-01-04',
      progressPercent: 10
    })
    const doneLate = task({ ...overdue, status: 'done' })
    expect(getTaskScheduleHealth(doneLate, jan5)).toBe('none')
  })

  it('resolves milestone schedule window', () => {
    expect(
      resolveTaskScheduleWindow(
        task({ taskId: 'x', title: 'm', milestone: true, endDate: '2026-02-01' })
      )
    ).toEqual({
      startDate: '2026-02-01',
      endDate: '2026-02-01'
    })
  })
})
