import type { TaskStatus } from '../task/types'

/** 看板角标：指派给我且未完成（todo / doing） */
export const MINE_OPEN_STATUSES: readonly TaskStatus[] = ['todo', 'doing']

export function isMineOpenStatus(status: string): boolean {
  return status === 'todo' || status === 'doing'
}

export type MineOpenTaskLike = {
  assigneeUserId?: string | null
  status: string
  deletedAt?: string | null
}

/**
 * 是否计入看板「与我相关」角标。
 * 条件：未删除 · assignee === userId · status ∈ {todo, doing}
 */
export function isMineOpenTask(task: MineOpenTaskLike, userId: string): boolean {
  if (!userId) return false
  if (task.deletedAt) return false
  if (task.assigneeUserId !== userId) return false
  return isMineOpenStatus(task.status)
}

export function countMineOpenTasks(
  tasks: readonly MineOpenTaskLike[],
  userId: string
): number {
  let n = 0
  for (const t of tasks) {
    if (isMineOpenTask(t, userId)) n++
  }
  return n
}
