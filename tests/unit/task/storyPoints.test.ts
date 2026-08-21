import { describe, expect, it } from 'vitest'
import {
  parseStoryPoints,
  resolveStoryPointsPatch,
  sumStoryPointsByStatus
} from '@shared/task/storyPoints'
import type { Task } from '@shared/task/types'

function task(partial: Partial<Task> & Pick<Task, 'taskId' | 'status'>): Task {
  return {
    groupId: 'g1',
    title: partial.taskId,
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: 't',
    updatedAt: 't',
    ...partial
  }
}

describe('parseStoryPoints', () => {
  it('accepts 1–99', () => {
    expect(parseStoryPoints(1)).toBe(1)
    expect(parseStoryPoints(99)).toBe(99)
    expect(parseStoryPoints(3.2)).toBe(3)
  })

  it('treats empty and out of range as unestimated', () => {
    expect(parseStoryPoints(null)).toBeUndefined()
    expect(parseStoryPoints(0)).toBeUndefined()
    expect(parseStoryPoints(100)).toBeUndefined()
    expect(parseStoryPoints('x')).toBeUndefined()
  })
})

describe('resolveStoryPointsPatch', () => {
  it('clears on null and throws on invalid', () => {
    expect(resolveStoryPointsPatch(null, 5)).toBeUndefined()
    expect(resolveStoryPointsPatch(8, 5)).toBe(8)
    expect(resolveStoryPointsPatch(undefined, 5)).toBe(5)
    expect(() => resolveStoryPointsPatch(0, 5)).toThrow(/1 to 99/)
  })
})

describe('sumStoryPointsByStatus', () => {
  it('sums estimated tasks only', () => {
    const sums = sumStoryPointsByStatus([
      task({ taskId: 'a', status: 'todo', storyPoints: 3 }),
      task({ taskId: 'b', status: 'todo', storyPoints: 5 }),
      task({ taskId: 'c', status: 'todo' }),
      task({ taskId: 'd', status: 'doing', storyPoints: 2 })
    ])
    expect(sums.todo).toBe(8)
    expect(sums.doing).toBe(2)
    expect(sums.done).toBe(0)
  })
})
