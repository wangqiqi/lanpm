import type { Task, TaskStatus } from './types.ts'
import { KANBAN_COLUMN_ORDER } from './kanban.ts'

export const STORY_POINTS_MIN = 1
export const STORY_POINTS_MAX = 99

/** Empty / invalid → undefined (unestimated). Valid 1–99 kept. */
export function parseStoryPoints(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return undefined
  const rounded = Math.round(n)
  if (rounded < STORY_POINTS_MIN || rounded > STORY_POINTS_MAX) return undefined
  return rounded
}

/** Patch helper: null clears; invalid throws. */
export function resolveStoryPointsPatch(
  incoming: unknown,
  existing: number | undefined
): number | undefined {
  if (incoming === undefined) return existing
  if (incoming === null || incoming === '') return undefined
  const parsed = parseStoryPoints(incoming)
  if (parsed === undefined) {
    throw new Error('storyPoints must be an integer from 1 to 99')
  }
  return parsed
}

export function sumStoryPointsByStatus(
  tasks: Task[]
): Record<TaskStatus, number> {
  const sums = {
    todo: 0,
    doing: 0,
    done: 0,
    other: 0
  } satisfies Record<TaskStatus, number>
  for (const task of tasks) {
    if (task.deletedAt) continue
    const pts = parseStoryPoints(task.storyPoints)
    if (pts === undefined) continue
    sums[task.status] += pts
  }
  return sums
}

export function formatColumnPointSums(
  sums: Record<TaskStatus, number>,
  labels: Record<TaskStatus, string>
): string {
  return KANBAN_COLUMN_ORDER.map((status) => `${labels[status]} ${sums[status]}`).join(' · ')
}
