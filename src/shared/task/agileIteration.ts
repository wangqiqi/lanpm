import type { Task } from './types.ts'

export type AgileIteration = {
  iterationId: string
  groupId: string
  name: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export type AgileIterationSnapshot = {
  groupId: string
  currentIterationId: string | null
  iterations: AgileIteration[]
}

const YMD = /^\d{4}-\d{2}-\d{2}$/
const NAME_MAX = 80

export function isIterationYmd(value: string): boolean {
  return YMD.test(value)
}

export function parseIterationName(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const name = raw.trim()
  if (!name || name.length > NAME_MAX) return undefined
  return name
}

export function parseIterationDates(
  start: unknown,
  end: unknown
): { startDate: string; endDate: string } | undefined {
  if (typeof start !== 'string' || typeof end !== 'string') return undefined
  if (!isIterationYmd(start) || !isIterationYmd(end)) return undefined
  if (start > end) return undefined
  return { startDate: start, endDate: end }
}

/** 全群（current 为空）不过滤；选中迭代时只保留已挂入的任务。 */
export function tasksInCurrentIteration<T extends Pick<Task, 'iterationId'>>(
  tasks: readonly T[],
  currentIterationId: string | null
): T[] {
  if (!currentIterationId) return [...tasks]
  return tasks.filter((task) => task.iterationId === currentIterationId)
}
