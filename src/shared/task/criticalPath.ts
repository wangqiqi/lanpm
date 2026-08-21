import { diffDaysInclusive } from './scheduleHealth.ts'
import type { Task } from './types.ts'

export type CriticalPathEmptyReason = 'no_eligible' | 'no_fs' | 'cycle'

export interface CriticalPathResult {
  taskIds: string[]
  emptyReason?: CriticalPathEmptyReason
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function isCriticalPathEligible(task: Task): boolean {
  if (task.deletedAt) return false
  if (task.milestone) return false
  if (!task.startDate || !task.endDate) return false
  return true
}

export function taskDurationDays(task: Task): number {
  if (!task.startDate || !task.endDate) return 0
  return Math.max(1, diffDaysInclusive(parseYmd(task.startDate), parseYmd(task.endDate)))
}

function collectFsEdges(tasks: Task[], eligible: Set<string>): Array<[string, string]> {
  const edges: Array<[string, string]> = []
  const seen = new Set<string>()
  const push = (from: string, to: string): void => {
    if (from === to) return
    if (!eligible.has(from) || !eligible.has(to)) return
    const key = `${from}>${to}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push([from, to])
  }
  for (const task of tasks) {
    for (const dep of task.dependencies ?? []) {
      if (dep.type !== 'FS') continue
      const from = dep.fromTaskId
      const to = dep.toTaskId || task.taskId
      push(from, to)
    }
  }
  return edges
}

function hasCycle(ids: string[], edges: Array<[string, string]>): boolean {
  const succ = new Map<string, string[]>()
  for (const id of ids) succ.set(id, [])
  for (const [from, to] of edges) {
    succ.get(from)?.push(to)
  }
  const state = new Map<string, 0 | 1 | 2>()
  const visit = (id: string): boolean => {
    const s = state.get(id) ?? 0
    if (s === 1) return true
    if (s === 2) return false
    state.set(id, 1)
    for (const next of succ.get(id) ?? []) {
      if (visit(next)) return true
    }
    state.set(id, 2)
    return false
  }
  for (const id of ids) {
    if (visit(id)) return true
  }
  return false
}

/** Longest FS chain by inclusive duration. SS/FF/SF ignored. */
export function computeFsCriticalPath(tasks: Task[]): CriticalPathResult {
  const eligibleTasks = tasks.filter(isCriticalPathEligible)
  if (eligibleTasks.length === 0) {
    return { taskIds: [], emptyReason: 'no_eligible' }
  }
  const eligible = new Set(eligibleTasks.map((t) => t.taskId))
  const edges = collectFsEdges(tasks, eligible)
  if (edges.length === 0) {
    return { taskIds: [], emptyReason: 'no_fs' }
  }
  const ids = eligibleTasks.map((t) => t.taskId)
  if (hasCycle(ids, edges)) {
    return { taskIds: [], emptyReason: 'cycle' }
  }

  const duration = new Map(eligibleTasks.map((t) => [t.taskId, taskDurationDays(t)]))
  const preds = new Map<string, string[]>()
  const succs = new Map<string, string[]>()
  for (const id of ids) {
    preds.set(id, [])
    succs.set(id, [])
  }
  for (const [from, to] of edges) {
    preds.get(to)?.push(from)
    succs.get(from)?.push(to)
  }

  const indeg = new Map(ids.map((id) => [id, preds.get(id)?.length ?? 0]))
  const queue = ids.filter((id) => (indeg.get(id) ?? 0) === 0)
  const order: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    for (const next of succs.get(id) ?? []) {
      const n = (indeg.get(next) ?? 1) - 1
      indeg.set(next, n)
      if (n === 0) queue.push(next)
    }
  }
  if (order.length !== ids.length) {
    return { taskIds: [], emptyReason: 'cycle' }
  }

  const dist = new Map<string, number>()
  const parent = new Map<string, string | null>()
  for (const id of order) {
    let bestPred: string | null = null
    let best = 0
    for (const p of preds.get(id) ?? []) {
      const score = dist.get(p) ?? 0
      if (score > best) {
        best = score
        bestPred = p
      }
    }
    dist.set(id, best + (duration.get(id) ?? 1))
    parent.set(id, bestPred)
  }

  let end = order[0]!
  let max = dist.get(end) ?? 0
  for (const id of order) {
    const d = dist.get(id) ?? 0
    if (d > max) {
      max = d
      end = id
    }
  }

  const path: string[] = []
  let cur: string | null = end
  while (cur) {
    path.push(cur)
    cur = parent.get(cur) ?? null
  }
  path.reverse()
  return { taskIds: path }
}
