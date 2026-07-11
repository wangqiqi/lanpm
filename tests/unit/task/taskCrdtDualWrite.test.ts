import { describe, expect, it } from 'vitest'
import {
  applyTaskToDoc,
  countTasksInDoc,
  createEmptyTaskDoc
} from '../../../src/shared/task/taskCrdtModel'
import type { Task } from '../../../src/shared/task/types'

/** Pure dual-write shape check — SQLite→Y.Doc field mirror (TASK-160). */
describe('taskCrdt dual-write model', () => {
  it('mirrors upsert and soft-delete fields into the same Y.Map entry', () => {
    const doc = createEmptyTaskDoc()
    const base: Task = {
      taskId: 't1',
      groupId: 'g1',
      title: 'A',
      status: 'todo',
      priority: 'low',
      progressPercent: 0,
      sortOrder: 0,
      createdBy: 'u',
      createdAt: '2026-07-11T00:00:00.000Z',
      updatedAt: '2026-07-11T00:00:00.000Z'
    }
    applyTaskToDoc(doc, base)
    applyTaskToDoc(doc, {
      ...base,
      title: 'B',
      updatedAt: '2026-07-11T01:00:00.000Z'
    })
    expect(countTasksInDoc(doc)).toBe(1)
    expect(doc.getMap('tasks').get('t1')?.get('title')).toBe('B')

    applyTaskToDoc(doc, {
      ...base,
      title: 'B',
      deletedAt: '2026-07-11T02:00:00.000Z',
      updatedAt: '2026-07-11T02:00:00.000Z'
    })
    expect(doc.getMap('tasks').get('t1')?.get('deletedAt')).toBe('2026-07-11T02:00:00.000Z')
  })
})
