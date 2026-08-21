import { describe, expect, it } from 'vitest'
import type { Task } from '../../../src/shared/task/types.ts'
import {
  countTasksByStatus,
  isColumnOverWip,
  overWipColumns,
  parseWipLimit
} from '../../../src/shared/task/columnWip.ts'

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

describe('parseWipLimit', () => {
  it('accepts 1–99', () => {
    expect(parseWipLimit(3)).toBe(3)
    expect(parseWipLimit(99)).toBe(99)
    expect(parseWipLimit(100)).toBe(99)
  })

  it('treats 0 and non-integers as unlimited', () => {
    expect(parseWipLimit(0)).toBeUndefined()
    expect(parseWipLimit(1.5)).toBeUndefined()
    expect(parseWipLimit(null)).toBeUndefined()
  })
})

describe('column WIP counts', () => {
  it('ignores deleted tasks', () => {
    const counts = countTasksByStatus([
      task({ taskId: 'a', status: 'doing' }),
      task({ taskId: 'b', status: 'doing', deletedAt: 'x' }),
      task({ taskId: 'c', status: 'todo' })
    ])
    expect(counts.doing).toBe(1)
    expect(counts.todo).toBe(1)
  })

  it('flags over limit but not equal', () => {
    expect(isColumnOverWip(3, 3)).toBe(false)
    expect(isColumnOverWip(4, 3)).toBe(true)
    expect(isColumnOverWip(4, undefined)).toBe(false)
  })

  it('lists over columns', () => {
    expect(
      overWipColumns(
        { todo: 2, doing: 5, done: 0, other: 0 },
        { doing: 3 }
      )
    ).toEqual(['doing'])
  })
})
