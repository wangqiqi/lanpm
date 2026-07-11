import { describe, expect, it } from 'vitest'
import { addOneDayYmd, scheduleFromCalendarExclusiveRange, subtractOneDayYmd, tasksToCalendarEvents } from '@shared/task/calendarEvents'
import { defaultScheduleForTask } from '@shared/task/ganttAdapter'
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

describe('subtractOneDayYmd', () => {
  it('rolls month/year backward', () => {
    expect(subtractOneDayYmd('2026-07-12')).toBe('2026-07-11')
    expect(subtractOneDayYmd('2026-08-01')).toBe('2026-07-31')
    expect(subtractOneDayYmd('2027-01-01')).toBe('2026-12-31')
  })
})

describe('scheduleFromCalendarExclusiveRange', () => {
  it('maps multi-day exclusive end to inclusive dates', () => {
    expect(scheduleFromCalendarExclusiveRange('2026-07-10', '2026-07-13')).toEqual({
      startDate: '2026-07-10',
      endDate: '2026-07-12'
    })
  })

  it('maps single-day (end = start+1) and null end', () => {
    expect(scheduleFromCalendarExclusiveRange('2026-07-11', '2026-07-12')).toEqual({
      startDate: '2026-07-11',
      endDate: '2026-07-11'
    })
    expect(scheduleFromCalendarExclusiveRange('2026-07-11', null)).toEqual({
      startDate: '2026-07-11',
      endDate: '2026-07-11'
    })
  })

  it('rejects invalid or inverted ranges', () => {
    expect(scheduleFromCalendarExclusiveRange('bad', '2026-07-12')).toBeNull()
    expect(scheduleFromCalendarExclusiveRange('2026-07-11', '2026-07-11')).toBeNull()
    expect(scheduleFromCalendarExclusiveRange('2026-07-12', '2026-07-11')).toBeNull()
  })

  it('round-trips with tasksToCalendarEvents exclusive end', () => {
    const events = tasksToCalendarEvents([
      task({
        taskId: 't2',
        title: 'Span',
        startDate: '2026-07-10',
        endDate: '2026-07-12'
      })
    ])
    const ev = events[0]!
    expect(scheduleFromCalendarExclusiveRange(ev.start, ev.end)).toEqual({
      startDate: '2026-07-10',
      endDate: '2026-07-12'
    })
  })
})

describe('tasksToCalendarEvents', () => {
  it('skips deleted; infers schedule for undated (same as gantt)', () => {
    const undated = task({ taskId: 'a', title: 'no dates' })
    const events = tasksToCalendarEvents([
      undated,
      task({
        taskId: 'b',
        title: 'gone',
        endDate: '2026-07-11',
        deletedAt: '2026-07-10T00:00:00.000Z'
      })
    ])
    expect(events).toHaveLength(1)
    const fallback = defaultScheduleForTask(undated)
    expect(events[0]).toMatchObject({
      id: 'a',
      title: 'no dates',
      start: fallback.startDate,
      end: addOneDayYmd(fallback.endDate),
      allDay: true,
      classNames: ['lanpm-cal-inferred'],
      extendedProps: { taskId: 'a', inferredSchedule: true }
    })
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
        extendedProps: { taskId: 't1', inferredSchedule: false }
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
        extendedProps: { taskId: 't2', inferredSchedule: false }
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
        extendedProps: { taskId: 't3', inferredSchedule: false }
      }
    ])
  })
})
