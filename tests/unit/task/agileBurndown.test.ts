import { describe, expect, it } from 'vitest'
import type { Task } from '@shared/task/types'
import {
  burndownPolyline,
  burndownWindow,
  buildAgileBurndownView,
  idealBurndown,
  remainingStoryPoints,
  totalEstimatedStoryPoints
} from '@shared/task/agileBurndown'

function task(partial: Partial<Task> & Pick<Task, 'taskId' | 'status'>): Task {
  return {
    groupId: 'g1',
    title: partial.taskId,
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...partial
  }
}

describe('agileBurndown', () => {
  it('sums remaining as non-done estimated points', () => {
    const tasks = [
      task({ taskId: 'a', status: 'todo', storyPoints: 5 }),
      task({ taskId: 'b', status: 'doing', storyPoints: 3 }),
      task({ taskId: 'c', status: 'done', storyPoints: 8 }),
      task({ taskId: 'd', status: 'todo', deletedAt: 'x', storyPoints: 9 })
    ]
    expect(remainingStoryPoints(tasks)).toBe(8)
    expect(totalEstimatedStoryPoints(tasks)).toBe(16)
  })

  it('builds a linear ideal line from total to zero', () => {
    expect(idealBurndown('2026-08-01', '2026-08-05', 10)).toEqual([
      { day: '2026-08-01', remaining: 10 },
      { day: '2026-08-02', remaining: 8 },
      { day: '2026-08-03', remaining: 5 },
      { day: '2026-08-04', remaining: 3 },
      { day: '2026-08-05', remaining: 0 }
    ])
  })

  it('uses task dates for the calendar window', () => {
    expect(
      burndownWindow(
        [
          task({
            taskId: 'a',
            status: 'todo',
            storyPoints: 2,
            startDate: '2026-08-10',
            endDate: '2026-08-20'
          })
        ],
        '2026-08-15'
      )
    ).toEqual({ start: '2026-08-10', end: '2026-08-20' })
  })

  it('overlays today remaining onto samples', () => {
    const view = buildAgileBurndownView({
      groupId: 'g1',
      today: '2026-08-12',
      tasks: [
        task({
          taskId: 'a',
          status: 'todo',
          storyPoints: 4,
          startDate: '2026-08-10',
          endDate: '2026-08-14'
        })
      ],
      samples: [{ day: '2026-08-10', remaining: 8 }]
    })
    expect(view.remaining).toBe(4)
    expect(view.samples[0]).toEqual({ day: '2026-08-10', remaining: 8 })
    expect(view.samples.find((s) => s.day === '2026-08-12')?.remaining).toBe(4)
    expect(view.ideal[0]?.remaining).toBe(4)
    expect(view.ideal.at(-1)?.remaining).toBe(0)
  })

  it('emits an svg polyline', () => {
    const pts = burndownPolyline(
      [
        { day: 'a', remaining: 10 },
        { day: 'b', remaining: 0 }
      ],
      100,
      20,
      10
    )
    expect(pts).toMatch(/^0\.0,0\.0 /)
    expect(pts).toMatch(/100\.0,20\.0$/)
  })
})
