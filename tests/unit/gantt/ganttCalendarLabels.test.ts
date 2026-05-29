import { describe, expect, it } from 'vitest'
import { ViewMode, type Task as GanttTask } from 'gantt-task-react'
import {
  computeGanttTimelineDates,
  formatWeekColumnLabel,
  ganttDateRange,
  seedGanttDates
} from '@shared/task/ganttTimeline'

function bar(start: string, end: string): GanttTask {
  return {
    id: 't1',
    name: 'Task',
    type: 'task',
    start: new Date(start),
    end: new Date(end),
    progress: 0
  }
}

describe('ganttTimeline', () => {
  it('computes week columns as 7-day steps', () => {
    const tasks = [bar('2026-05-20', '2026-06-10')]
    const [start, end] = ganttDateRange(tasks, ViewMode.Week)
    const dates = seedGanttDates(start, end, ViewMode.Week)
    expect(dates.length).toBeGreaterThan(1)
    const deltaDays = (dates[1]!.getTime() - dates[0]!.getTime()) / 86_400_000
    expect(deltaDays).toBe(7)
  })

  it('computeGanttTimelineDates returns non-empty range for tasks', () => {
    const tasks = [bar('2026-05-01', '2026-05-15')]
    const dates = computeGanttTimelineDates(tasks, ViewMode.Week)
    expect(dates.length).toBeGreaterThan(0)
    expect(dates[0]!.getDay()).toBe(1)
  })
})

describe('formatWeekColumnLabel', () => {
  it('formats zh-CN week range', () => {
    const label = formatWeekColumnLabel(new Date(2026, 4, 18), 'zh-CN')
    expect(label).toMatch(/5\/1[89].*5\/2[0-4]/)
  })

  it('formats en-US week range', () => {
    const label = formatWeekColumnLabel(new Date(2026, 4, 18), 'en-US')
    expect(label).toContain('–')
    expect(label.length).toBeGreaterThan(5)
  })
})
