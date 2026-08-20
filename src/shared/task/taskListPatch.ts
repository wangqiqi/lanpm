import type { Task } from './types'

export function upsertTaskInList(tasks: Task[], task: Task): Task[] {
  const i = tasks.findIndex((t) => t.taskId === task.taskId)
  if (i === -1) return [...tasks, task]
  const next = tasks.slice()
  next[i] = task
  return next
}
