/**
 * Y.Doc shape for `task:{groupId}` (docs/03 §10 · A2 full task fields).
 * Pure helpers — no SQLite / Electron.
 */
import * as Y from 'yjs'
import type { Task } from './types'
import { normalizeTaskTags } from './tags'
import { normalizeLinkedFileIds } from './linkedFiles'

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
  'tags',
  'sourceMsgId',
  'linkedFileIds',
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
  const tags = normalizeTaskTags(task.tags ?? [])
  setOptional(row, 'tags', tags.length > 0 ? tags : undefined)
  setOptional(row, 'sourceMsgId', task.sourceMsgId)
  const linked = normalizeLinkedFileIds(task.linkedFileIds ?? [])
  setOptional(row, 'linkedFileIds', linked.length > 0 ? linked : undefined)
  setOptional(row, 'startDate', task.startDate)
  setOptional(row, 'endDate', task.endDate)
  setOptional(row, 'milestone', task.milestone ?? false)
  setOptional(row, 'deletedAt', task.deletedAt)
}

/** Seed empty (or existing) doc from SQLite task rows. Does not clear unknown keys. */
export function seedDocFromTasks(doc: Y.Doc, tasks: Task[], origin: unknown = 'seed'): void {
  doc.transact(() => {
    for (const task of tasks) {
      applyTaskToDoc(doc, task)
    }
  }, origin)
}

export function countTasksInDoc(doc: Y.Doc): number {
  return doc.getMap(TASK_CRDT_TASKS_KEY).size
}

export function encodeDocState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc)
}

/** State vector for offline catch-up requests. */
export function encodeDocStateVector(doc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(doc)
}

/**
 * Diff update relative to remote state vector.
 * Empty SV → full document state.
 */
export function encodeDocStateAsUpdate(
  doc: Y.Doc,
  targetStateVector?: Uint8Array
): Uint8Array {
  if (!targetStateVector || targetStateVector.byteLength === 0) {
    return Y.encodeStateAsUpdate(doc)
  }
  return Y.encodeStateAsUpdate(doc, targetStateVector)
}

export function applyEncodedUpdate(
  doc: Y.Doc,
  update: Uint8Array,
  origin: unknown = null
): void {
  Y.applyUpdate(doc, update, origin)
}

export function createEmptyTaskDoc(): Y.Doc {
  const doc = new Y.Doc()
  doc.getMap(TASK_CRDT_TASKS_KEY)
  return doc
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

/** Read one task Y.Map back into a Task (for CRDT → SQLite). */
export function taskFromYMap(map: Y.Map<unknown>): Task | null {
  const taskId = asString(map.get('taskId'))
  const groupId = asString(map.get('groupId'))
  const title = asString(map.get('title'))
  const status = asString(map.get('status'))
  const priority = asString(map.get('priority'))
  const createdBy = asString(map.get('createdBy'))
  const createdAt = asString(map.get('createdAt'))
  const updatedAt = asString(map.get('updatedAt'))
  if (!taskId || !groupId || !title || !status || !priority || !createdBy || !createdAt || !updatedAt) {
    return null
  }
  const progressPercent = asNumber(map.get('progressPercent')) ?? 0
  const sortOrder = asNumber(map.get('sortOrder')) ?? 0
  const tagsRaw = map.get('tags')
  const tags = normalizeTaskTags(tagsRaw)
  const linked = normalizeLinkedFileIds(map.get('linkedFileIds'))
  return {
    taskId,
    groupId,
    title,
    status: status as Task['status'],
    priority: priority as Task['priority'],
    progressPercent,
    sortOrder,
    createdBy,
    createdAt,
    updatedAt,
    parentTaskId: asString(map.get('parentTaskId')),
    description: asString(map.get('description')),
    otherReason: asString(map.get('otherReason')),
    assigneeUserId: asString(map.get('assigneeUserId')),
    tags: tags.length > 0 ? tags : undefined,
    sourceMsgId: asString(map.get('sourceMsgId')),
    linkedFileIds: linked.length > 0 ? linked : undefined,
    startDate: asString(map.get('startDate')),
    endDate: asString(map.get('endDate')),
    milestone: asBoolean(map.get('milestone')),
    deletedAt: asString(map.get('deletedAt'))
  }
}

export function listTasksFromDoc(doc: Y.Doc): Task[] {
  const out: Task[] = []
  const tasks = doc.getMap(TASK_CRDT_TASKS_KEY)
  tasks.forEach((value) => {
    if (value instanceof Y.Map) {
      const task = taskFromYMap(value as Y.Map<unknown>)
      if (task) out.push(task)
    }
  })
  return out
}
