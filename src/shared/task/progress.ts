import type { Task } from './types'

/** 父任务进度 = round(avg(子任务 progressPercent))，见 docs/04 §3.4 */
export function aggregateChildProgress(children: Pick<Task, 'progressPercent'>[]): number {
  if (children.length === 0) return 0
  const sum = children.reduce((acc, c) => acc + c.progressPercent, 0)
  return Math.round(sum / children.length)
}

/** 为含子任务的父节点写入聚合后的 progressPercent（仅内存，不写库） */
export function applyAggregatedProgress(tasks: Task[]): Task[] {
  const result = tasks.map((t) => ({ ...t }))
  const byId = new Map(result.map((t) => [t.taskId, t]))
  const childrenOf = new Map<string, Task[]>()

  for (const t of result) {
    if (!t.parentTaskId) continue
    const list = childrenOf.get(t.parentTaskId) ?? []
    list.push(t)
    childrenOf.set(t.parentTaskId, list)
  }

  const depth = new Map<string, number>()
  const getDepth = (id: string): number => {
    const cached = depth.get(id)
    if (cached !== undefined) return cached
    const task = byId.get(id)
    if (!task?.parentTaskId) {
      depth.set(id, 0)
      return 0
    }
    const d = getDepth(task.parentTaskId) + 1
    depth.set(id, d)
    return d
  }
  for (const t of result) getDepth(t.taskId)

  const parentIds = [...childrenOf.keys()].sort(
    (a, b) => (depth.get(b) ?? 0) - (depth.get(a) ?? 0)
  )
  for (const parentId of parentIds) {
    const parent = byId.get(parentId)
    const children = childrenOf.get(parentId) ?? []
    if (parent && children.length > 0) {
      parent.progressPercent = aggregateChildProgress(children)
    }
  }

  return result
}
