import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import type { Task } from '../../../src/shared/task/types'
import {
  applyEncodedUpdate,
  applyTaskToDoc,
  countTasksInDoc,
  createEmptyTaskDoc,
  encodeDocState,
  listTasksFromDoc,
  seedDocFromTasks,
  TASK_CRDT_TASKS_KEY
} from '../../../src/shared/task/taskCrdtModel'

function sampleTask(overrides: Partial<Task> = {}): Task {
  return {
    taskId: 't1',
    groupId: 'g1',
    title: 'Hello',
    status: 'todo',
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    description: 'desc',
    ...overrides
  }
}

describe('taskCrdtModel', () => {
  it('seeds tasks into Y.Map and encodes/decodes', () => {
    const doc = createEmptyTaskDoc()
    seedDocFromTasks(doc, [
      sampleTask(),
      sampleTask({ taskId: 't2', title: 'Two', deletedAt: '2026-01-02T00:00:00.000Z' })
    ])
    expect(countTasksInDoc(doc)).toBe(2)

    const tasks = doc.getMap(TASK_CRDT_TASKS_KEY)
    const t1 = tasks.get('t1') as Y.Map<unknown>
    expect(t1.get('title')).toBe('Hello')
    expect(t1.get('description')).toBe('desc')

    const remote = createEmptyTaskDoc()
    applyEncodedUpdate(remote, encodeDocState(doc))
    expect(countTasksInDoc(remote)).toBe(2)
    expect((remote.getMap(TASK_CRDT_TASKS_KEY).get('t2') as Y.Map<unknown>).get('title')).toBe(
      'Two'
    )
  })

  it('applyTaskToDoc updates fields in place', () => {
    const doc = createEmptyTaskDoc()
    applyTaskToDoc(doc, sampleTask())
    applyTaskToDoc(doc, sampleTask({ title: 'Updated', progressPercent: 40 }))
    const t1 = doc.getMap(TASK_CRDT_TASKS_KEY).get('t1') as Y.Map<unknown>
    expect(t1.get('title')).toBe('Updated')
    expect(t1.get('progressPercent')).toBe(40)
    expect(countTasksInDoc(doc)).toBe(1)
  })

  it('round-trips title/description via taskFromYMap', () => {
    const doc = createEmptyTaskDoc()
    seedDocFromTasks(doc, [
      sampleTask({ title: 'T', description: 'D body' })
    ])
    const listed = listTasksFromDoc(doc)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.title).toBe('T')
    expect(listed[0]?.description).toBe('D body')
  })
})
