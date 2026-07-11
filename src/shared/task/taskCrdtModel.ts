/**
 * Y.Doc shape for `task:{groupId}` (docs/03 §10 · A2 full task fields).
 * Pure helpers — no SQLite / Electron.
 */
import * as Y from 'yjs'
import type { Task } from './types'

export const TASK_CRDT_TASKS_KEY = 'tasks'

/** Scalar fields mirrored into each task Y.Map (A2). */
export const TASK_CRDT_FIELD_KEYS = [
  'taskId',
  'groupId',
  'parentTaskId',
  'title',
  'description',
  'status',
  'otherReason',
  'priority',
  'assigneeUserId',
  'progressPercent',
  'startDate',
  'endDate',
  'milestone',
  'sortOrder',
  'createdBy',
  'createdAt',
  'updatedAt',
  'deletedAt'
] as const

export type TaskCrdtFieldKey = (typeof TASK_CRDT_FIELD_KEYS)[number]

function setOptional(map: Y.Map<unknown>, key: string, value: unknown): void {
  if (value === undefined || value === null) {
    map.delete(key)
  } else {
    map.set(key, value)
  }
}

/** Upsert one Task into doc.getMap('tasks'). */
export function applyTaskToDoc(doc: Y.Doc, task: Task): void {
  const tasks = doc.getMap<Y.Map<unknown>>(TASK_CRDT_TASKS_KEY)
  let row = tasks.get(task.taskId)
  if (!row) {
    row = new Y.Map<unknown>()
    tasks.set(task.taskId, row)
  }
  row.set('taskId', task.taskId)
  row.set('groupId', task.groupId)
  row.set('title', task.title)
  row.set('status', task.status)
  row.set('priority', task.priority)
  row.set('progressPercent', task.progressPercent)
  row.set('sortOrder', task.sortOrder)
  row.set('createdBy', task.createdBy)
  row.set('createdAt', task.createdAt)
  row.set('updatedAt', task.updatedAt)
  setOptional(row, 'parentTaskId', task.parentTaskId)
  setOptional(row, 'description', task.description)
  setOptional(row, 'otherReason', task.otherReason)
  setOptional(row, 'assigneeUserId', task.assigneeUserId)
  setOptional(row, 'startDate', task.startDate)
  setOptional(row, 'endDate', task.endDate)
  setOptional(row, 'milestone', task.milestone ?? false)
  setOptional(row, 'deletedAt', task.deletedAt)
}

/** Seed empty (or existing) doc from SQLite task rows. Does not clear unknown keys. */
export function seedDocFromTasks(doc: Y.Doc, tasks: Task[]): void {
  doc.transact(() => {
    for (const task of tasks) {
      applyTaskToDoc(doc, task)
    }
  })
}

export function countTasksInDoc(doc: Y.Doc): number {
  return doc.getMap(TASK_CRDT_TASKS_KEY).size
}

export function encodeDocState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc)
}

export function applyEncodedUpdate(doc: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(doc, update)
}

export function createEmptyTaskDoc(): Y.Doc {
  const doc = new Y.Doc()
  doc.getMap(TASK_CRDT_TASKS_KEY)
  return doc
}
