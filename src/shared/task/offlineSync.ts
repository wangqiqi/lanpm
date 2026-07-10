import type { Task } from './types'
import type { TaskDepPatchPayload } from './sync'

/** Align with chat offline batch size (TASK-134). */
export const TASK_OFFLINE_SYNC_BATCH_LIMIT = 100

export interface TaskSyncRequestPayload {
  /** Exclusive lower bound (ISO8601); empty string = from epoch */
  sinceUpdatedAt: string
  /** Inclusive TTL cutoff (ISO8601) */
  minUpdatedAt: string
}

export interface TaskSyncBatchPayload {
  tasks: Task[]
  dependencies: TaskDepPatchPayload[]
  /** True when more rows remain after this page */
  hasMore?: boolean
}

export function splitTaskOfflineSyncPage<T>(
  rows: T[],
  limit = TASK_OFFLINE_SYNC_BATCH_LIMIT
): { items: T[]; hasMore: boolean } {
  if (rows.length > limit) {
    return { items: rows.slice(0, limit), hasMore: true }
  }
  return { items: rows, hasMore: false }
}

export function maxUpdatedAtInTasks(tasks: Task[]): string {
  let max = ''
  for (const t of tasks) {
    if (t.updatedAt > max) max = t.updatedAt
  }
  return max
}

export function maxUpdatedAtInDepPatches(deps: TaskDepPatchPayload[]): string {
  let max = ''
  for (const d of deps) {
    if (d.updatedAt > max) max = d.updatedAt
  }
  return max
}

export function maxIsoTimestamp(...values: string[]): string {
  let max = ''
  for (const v of values) {
    if (v > max) max = v
  }
  return max
}

export function isTaskSyncRequestPayload(value: unknown): value is TaskSyncRequestPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.sinceUpdatedAt === 'string' && typeof v.minUpdatedAt === 'string' && !!v.minUpdatedAt
}

export function isTaskSyncBatchPayload(value: unknown): value is TaskSyncBatchPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return Array.isArray(v.tasks) && Array.isArray(v.dependencies)
}
