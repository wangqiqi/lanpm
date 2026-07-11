import { describe, expect, it } from 'vitest'
import { addOneDayYmd, tasksToCalendarEvents } from '@shared/task/calendarEvents'
import type { Task } from '@shared/task/types'

function task(partial: Partial<Task> & Pick<Task, 'taskId' | 'title'>): Task {
  return {
    groupId: 'g1',
    status: 'todo',
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...partial
  }
}

describe('addOneDayYmd', () => {
  it('rolls month/year', () => {
    expect(addOneDayYmd('2026-07-11')).toBe('2026-07-12')
    expect(addOneDayYmd('2026-07-31')).toBe('2026-08-01')
    expect(addOneDayYmd('2026-12-31')).toBe('2027-01-01')
  })
})

describe('tasksToCalendarEvents (TASK-221)', () => {
  it('skips undated and deleted', () => {
    expect(
      tasksToCalendarEvents([
        task({ taskId: 'a', title: 'no dates' }),
        task({ taskId: 'b', title: 'gone', endDate: '2026-07-11', deletedAt: '2026-07-10T00:00:00.000Z' })
      ])
    ).toEqual([])
  })

  it('maps endDate-only to single all-day day', () => {
    expect(
      tasksToCalendarEvents([task({ taskId: 't1', title: 'Due', endDate: '2026-07-11' })])
    ).toEqual([
      {
        id: 't1',
        title: 'Due',
        start: '2026-07-11',
        end: '2026-07-12',
        allDay: true,
        extendedProps: { taskId: 't1' }
      }
    ])
  })

  it('maps start+end as inclusive range with exclusive end', () => {
    expect(
      tasksToCalendarEvents([
        task({
          taskId: 't2',
          title: 'Span',
          startDate: '2026-07-10',
          endDate: '2026-07-12'
        })
      ])
    ).toEqual([
      {
        id: 't2',
        title: 'Span',
        start: '2026-07-10',
        end: '2026-07-13',
        allDay: true,
        extendedProps: { taskId: 't2' }
      }
    ])
  })

  it('maps startDate-only to single day', () => {
    expect(
      tasksToCalendarEvents([task({ taskId: 't3', title: 'Start', startDate: '2026-07-05' })])
    ).toEqual([
      {
        id: 't3',
        title: 'Start',
        start: '2026-07-05',
        end: '2026-07-06',
        allDay: true,
        extendedProps: { taskId: 't3' }
      }
    ])
  })
})
