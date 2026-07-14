import type { DepartmentStats } from './types'

/** 兼容旧 IPC/缓存无 doneCount 字段；优先用显式计数，否则由完成率反推 */
export function resolveDeptDoneCount(
  d: Pick<DepartmentStats, 'doneCount' | 'taskCount' | 'completionPercent'>
): number {
  if (typeof d.doneCount === 'number' && Number.isFinite(d.doneCount)) {
    return Math.max(0, Math.min(d.taskCount, Math.round(d.doneCount)))
  }
  if (d.taskCount <= 0) return 0
  return Math.round((d.completionPercent / 100) * d.taskCount)
}
