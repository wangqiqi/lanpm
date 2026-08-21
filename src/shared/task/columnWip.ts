import type { Task, TaskStatus } from './types.ts'

export const COLUMN_WIP_STATUSES: readonly TaskStatus[] = ['todo', 'doing', 'done', 'other']

export type ColumnWipLimits = Partial<Record<TaskStatus, number>>

export type AgileWipSnapshot = {
  groupId: string
  limits: ColumnWipLimits
}

export function isWipStatus(value: string): value is TaskStatus {
  return (COLUMN_WIP_STATUSES as readonly string[]).includes(value)
}

/** Integer 1–99; otherwise unlimited (omit). */
export function parseWipLimit(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    return undefined
  }
  if (value < 1) return undefined
  return Math.min(99, value)
}

export function countTasksByStatus(tasks: readonly Task[]): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = { todo: 0, doing: 0, done: 0, other: 0 }
  for (const task of tasks) {
    if (task.deletedAt) continue
    counts[task.status] += 1
  }
  return counts
}

export function isColumnOverWip(count: number, limit: number | undefined): boolean {
  if (limit === undefined) return false
  return count > limit
}

export function overWipColumns(
  counts: Record<TaskStatus, number>,
  limits: ColumnWipLimits
): TaskStatus[] {
  return COLUMN_WIP_STATUSES.filter((status) => isColumnOverWip(counts[status], limits[status]))
}
