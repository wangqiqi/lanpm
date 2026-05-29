import { describe, expect, it } from 'vitest'
import { aggregateChildProgress, applyAggregatedProgress } from '@shared/task/progress'
import type { Task } from '@shared/task/types'

function task(partial: Partial<Task> & Pick<Task, 'taskId'>): Task {
  return {
    groupId: 'g1',
    title: partial.title ?? partial.taskId,
    status: 'todo',
    priority: 'medium',
    progressPercent: partial.progressPercent ?? 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial
  }
}

describe('aggregateChildProgress', () => {
  it('averages child progress', () => {
    expect(
      aggregateChildProgress([{ progressPercent: 40 }, { progressPercent: 80 }])
    ).toBe(60)
  })

  it('returns 0 for empty children', () => {
    expect(aggregateChildProgress([])).toBe(0)
  })
})

describe('applyAggregatedProgress', () => {
  it('rolls child progress up to parent', () => {
    const parent = task({ taskId: 'p1', progressPercent: 0 })
    const c1 = task({ taskId: 'c1', parentTaskId: 'p1', progressPercent: 100 })
    const c2 = task({ taskId: 'c2', parentTaskId: 'p1', progressPercent: 50 })
    const out = applyAggregatedProgress([parent, c1, c2])
    expect(out.find((t) => t.taskId === 'p1')?.progressPercent).toBe(75)
  })
})
