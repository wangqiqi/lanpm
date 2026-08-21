import { describe, expect, it } from 'vitest'
import type { Task } from '@shared/task/types'
import type { AgileIteration } from '@shared/task/agileIteration'
import {
  buildAgileVelocityView,
  completedPointsInIteration,
  velocityBarRects
} from '@shared/task/agileVelocity'

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

function iteration(
  partial: Pick<AgileIteration, 'iterationId' | 'name' | 'startDate'>
): AgileIteration {
  const endDate = partial.startDate > '2026-08-14' ? '2026-08-28' : '2026-08-14'
  return {
    groupId: 'g1',
    endDate,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...partial
  }
}

describe('agileVelocity', () => {
  it('sums only done estimated points in the iteration', () => {
    const tasks = [
      task({ taskId: 'a', status: 'done', iterationId: 'it1', storyPoints: 5 }),
      task({ taskId: 'b', status: 'todo', iterationId: 'it1', storyPoints: 8 }),
      task({ taskId: 'c', status: 'done', iterationId: 'it1' }),
      task({ taskId: 'd', status: 'done', iterationId: 'it2', storyPoints: 3 }),
      task({ taskId: 'e', status: 'done', iterationId: 'it1', storyPoints: 2, deletedAt: 'x' })
    ]
    expect(completedPointsInIteration(tasks, 'it1')).toBe(5)
  })

  it('orders bars by iteration start date', () => {
    const view = buildAgileVelocityView(
      'g1',
      [
        iteration({ iterationId: 'it2', name: 'B', startDate: '2026-08-17' }),
        iteration({ iterationId: 'it1', name: 'A', startDate: '2026-08-03' })
      ],
      [
        task({ taskId: 'a', status: 'done', iterationId: 'it1', storyPoints: 4 }),
        task({ taskId: 'b', status: 'done', iterationId: 'it2', storyPoints: 6 })
      ]
    )
    expect(view.bars.map((b) => b.iterationId)).toEqual(['it1', 'it2'])
    expect(view.bars.map((b) => b.completedPoints)).toEqual([4, 6])
  })

  it('skips rects when every bar is zero', () => {
    expect(
      velocityBarRects(
        [{ iterationId: 'it1', name: 'A', startDate: '2026-08-03', endDate: '2026-08-14', completedPoints: 0 }],
        128,
        28
      )
    ).toEqual([])
  })
})
