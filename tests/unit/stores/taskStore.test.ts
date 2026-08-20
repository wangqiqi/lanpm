import { describe, expect, it } from 'vitest'
import type { Task } from '@shared/task/types'
import { upsertTaskInList } from '@shared/task/taskListPatch'

const base = (over: Partial<Task> & Pick<Task, 'taskId' | 'title'>): Task => ({
  groupId: 'g1',
  status: 'todo',
  priority: 'medium',
  progressPercent: 0,
  sortOrder: 0,
  createdBy: 'u',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  ...over
})

describe('upsertTaskInList', () => {
  it('appends when the task is new', () => {
    const a = base({ taskId: 't1', title: 'A' })
    const b = base({ taskId: 't2', title: 'B' })
    expect(upsertTaskInList([a], b)).toEqual([a, b])
  })

  it('replaces in place when the task already exists', () => {
    const a = base({ taskId: 't1', title: 'A' })
    const a2 = base({ taskId: 't1', title: 'A2', status: 'doing' })
    expect(upsertTaskInList([a], a2)).toEqual([a2])
  })
})
