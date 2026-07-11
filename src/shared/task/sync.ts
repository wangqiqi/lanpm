import type { TaskDependency } from './dependency'
import type { Task } from './types'

export type TaskPatchAction = 'upsert' | 'delete'

/** docs/03 §6.2 — task_patch payload（LWW by task.updatedAt；Yjs 见 `taskCrdt.ts` / task_crdt） */
export interface TaskPatchPayload {
  action: TaskPatchAction
  task: Task
}

export type TaskDepPatchAction = 'upsert' | 'delete'

/**
 * docs/03 §6.2 — task_dep_patch payload（甘特/看板依赖边 P2P 同步）
 * Merge: same (fromTaskId, toTaskId) edge — LWW by `updatedAt`; delete wins if newer.
 */
export interface TaskDepPatchPayload {
  action: TaskDepPatchAction
  groupId: string
  dependency: TaskDependency
  /** ISO8601 — concurrent edits to the same edge */
  updatedAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const DEP_TYPES = new Set(['FS', 'SS', 'FF', 'SF'])

export function isTaskDepPatchPayload(value: unknown): value is TaskDepPatchPayload {
  if (!isRecord(value)) return false
  if (value.action !== 'upsert' && value.action !== 'delete') return false
  if (typeof value.groupId !== 'string' || !value.groupId) return false
  if (typeof value.updatedAt !== 'string' || !value.updatedAt) return false
  const dep = value.dependency
  if (!isRecord(dep)) return false
  if (typeof dep.fromTaskId !== 'string' || !dep.fromTaskId) return false
  if (typeof dep.toTaskId !== 'string' || !dep.toTaskId) return false
  if (typeof dep.type !== 'string' || !DEP_TYPES.has(dep.type)) return false
  return true
}
