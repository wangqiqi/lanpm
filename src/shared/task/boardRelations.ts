import type { TaskDependencyType } from './dependency'
import type { Task, TaskStatus } from './types'

export const BOARD_FAMILY_COUNT = 8

export interface BoardRelationBlocker {
  taskId: string
  title: string
  type: TaskDependencyType
}

export interface BoardTaskRelation {
  rootTaskId: string
  /** -1 = 无关联族（独立任务）；0–7 = 同族色条 */
  familyIndex: number
  parentTitle?: string
  childCount: number
  siblingCount: number
  blockedBy: BoardRelationBlocker[]
  successors: BoardRelationBlocker[]
  relatedIds: string[]
}

/** 看板悬停/固定高亮时绘制依赖连线用的边（与甘特 `TaskDependency` 同源） */
export interface BoardDependencyEdge {
  fromTaskId: string
  toTaskId: string
  type: TaskDependencyType
  /** 焦点是后继（入边）或前置（出边） */
  direction: 'incoming' | 'outgoing'
}

const DEFAULT_EDGE_TYPES: readonly TaskDependencyType[] = ['FS', 'SS', 'FF', 'SF']

/**
 * 焦点任务相关的依赖边列表。
 * `types` 默认全部；看板 MVP 可传 `['FS']` 只画完成-开始。
 */
export function listFocusDependencyEdges(
  focusTaskId: string,
  tasks: Task[],
  options?: { types?: readonly TaskDependencyType[] }
): BoardDependencyEdge[] {
  const byId = new Map(tasks.map((t) => [t.taskId, t]))
  if (!byId.has(focusTaskId)) return []

  const allow = new Set(options?.types ?? DEFAULT_EDGE_TYPES)
  const edges: BoardDependencyEdge[] = []
  const seen = new Set<string>()

  const push = (edge: BoardDependencyEdge): void => {
    if (!allow.has(edge.type)) return
    const key = `${edge.fromTaskId}>${edge.toTaskId}:${edge.type}:${edge.direction}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push(edge)
  }

  const focus = byId.get(focusTaskId)!
  for (const dep of focus.dependencies ?? []) {
    if (!byId.has(dep.fromTaskId)) continue
    push({
      fromTaskId: dep.fromTaskId,
      toTaskId: dep.toTaskId || focusTaskId,
      type: dep.type,
      direction: 'incoming'
    })
  }

  for (const t of tasks) {
    for (const dep of t.dependencies ?? []) {
      if (dep.fromTaskId !== focusTaskId) continue
      if (!byId.has(t.taskId)) continue
      push({
        fromTaskId: focusTaskId,
        toTaskId: dep.toTaskId || t.taskId,
        type: dep.type,
        direction: 'outgoing'
      })
    }
  }

  return edges
}

/**
 * 看板「显示全部连线」模式：板上所有 FS（等）依赖边，去重后每条 from→to 一条。
 */
export function listAllDependencyEdges(
  tasks: Task[],
  options?: { types?: readonly TaskDependencyType[] }
): BoardDependencyEdge[] {
  const byId = new Map(tasks.map((t) => [t.taskId, t]))
  const allow = new Set(options?.types ?? DEFAULT_EDGE_TYPES)
  const edges: BoardDependencyEdge[] = []
  const seen = new Set<string>()

  for (const task of tasks) {
    for (const dep of task.dependencies ?? []) {
      if (!allow.has(dep.type)) continue
      const fromTaskId = dep.fromTaskId
      const toTaskId = dep.toTaskId || task.taskId
      if (!byId.has(fromTaskId) || !byId.has(toTaskId)) continue
      const key = `${fromTaskId}>${toTaskId}:${dep.type}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({
        fromTaskId,
        toTaskId,
        type: dep.type,
        direction: 'outgoing'
      })
    }
  }

  return edges
}

function stableFamilyIndex(rootTaskId: string): number {
  let h = 0
  for (let i = 0; i < rootTaskId.length; i++) {
    h = (h * 31 + rootTaskId.charCodeAt(i)) >>> 0
  }
  return h % BOARD_FAMILY_COUNT
}

export function getRootTaskId(taskId: string, byId: Map<string, Task>): string {
  let cur = byId.get(taskId)
  const seen = new Set<string>()
  while (cur?.parentTaskId && !seen.has(cur.parentTaskId)) {
    seen.add(cur.taskId)
    const parent = byId.get(cur.parentTaskId)
    if (!parent) break
    cur = parent
  }
  return cur?.taskId ?? taskId
}

function listChildren(taskId: string, tasks: Task[]): Task[] {
  return tasks.filter((t) => t.parentTaskId === taskId)
}

function listSiblings(task: Task, tasks: Task[]): Task[] {
  if (!task.parentTaskId) {
    return tasks.filter((t) => !t.parentTaskId && t.taskId !== task.taskId)
  }
  return tasks.filter((t) => t.parentTaskId === task.parentTaskId && t.taskId !== task.taskId)
}

export function listTaskPredecessors(task: Task, byId: Map<string, Task>): BoardRelationBlocker[] {
  const out: BoardRelationBlocker[] = []
  for (const dep of task.dependencies ?? []) {
    const pred = byId.get(dep.fromTaskId)
    if (pred) {
      out.push({ taskId: pred.taskId, title: pred.title, type: dep.type })
    }
  }
  return out
}

export function listTaskSuccessors(taskId: string, tasks: Task[]): BoardRelationBlocker[] {
  const out: BoardRelationBlocker[] = []
  for (const t of tasks) {
    for (const dep of t.dependencies ?? []) {
      if (dep.fromTaskId === taskId) {
        out.push({ taskId: t.taskId, title: t.title, type: dep.type })
      }
    }
  }
  return out
}

export function collectRelatedTaskIds(
  taskId: string,
  tasks: Task[],
  byId: Map<string, Task>
): string[] {
  const task = byId.get(taskId)
  if (!task) return [taskId]
  const related = new Set<string>([taskId])

  let parentId = task.parentTaskId
  while (parentId) {
    related.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) break
    for (const s of listSiblings(parent, tasks)) related.add(s.taskId)
    parentId = parent.parentTaskId
  }

  const stack = [taskId]
  while (stack.length > 0) {
    const id = stack.pop()!
    for (const c of listChildren(id, tasks)) {
      related.add(c.taskId)
      stack.push(c.taskId)
    }
  }

  for (const s of listSiblings(task, tasks)) related.add(s.taskId)
  for (const p of listTaskPredecessors(task, byId)) related.add(p.taskId)
  for (const s of listTaskSuccessors(taskId, tasks)) related.add(s.taskId)

  return [...related]
}

function predStarted(pred: Task): boolean {
  return pred.status === 'doing' || pred.status === 'done'
}

/** 拖入 doing/done 时，按 FS/SS/FF/SF 规则检查前置任务 */
export function getDependencyBlockersForStatus(
  task: Task,
  byId: Map<string, Task>,
  targetStatus: TaskStatus
): BoardRelationBlocker[] {
  if (targetStatus !== 'doing' && targetStatus !== 'done') return []

  const blockers: BoardRelationBlocker[] = []
  for (const b of listTaskPredecessors(task, byId)) {
    const pred = byId.get(b.taskId)
    if (!pred) continue

    switch (b.type) {
      case 'FS':
        if (pred.status !== 'done') blockers.push(b)
        break
      case 'SS':
        if (!predStarted(pred)) blockers.push(b)
        break
      case 'FF':
        if (targetStatus === 'done' && pred.status !== 'done') blockers.push(b)
        break
      case 'SF':
        if (targetStatus === 'done' && !predStarted(pred)) blockers.push(b)
        break
      default:
        break
    }
  }
  return blockers
}

/** @deprecated 使用 getDependencyBlockersForStatus */
export function getFsBlockersForStatus(
  task: Task,
  byId: Map<string, Task>,
  targetStatus: TaskStatus
): BoardRelationBlocker[] {
  return getDependencyBlockersForStatus(task, byId, targetStatus).filter((b) => b.type === 'FS')
}

export function buildBoardRelationMap(tasks: Task[]): Map<string, BoardTaskRelation> {
  const byId = new Map(tasks.map((t) => [t.taskId, t]))
  const map = new Map<string, BoardTaskRelation>()

  for (const task of tasks) {
    const rootTaskId = getRootTaskId(task.taskId, byId)
    const children = listChildren(task.taskId, tasks)
    const siblings = listSiblings(task, tasks)
    const preds = listTaskPredecessors(task, byId)
    const succs = listTaskSuccessors(task.taskId, tasks)
    const hasFamily = !!task.parentTaskId || children.length > 0 || siblings.length > 0
    const hasDeps = preds.length > 0 || succs.length > 0
    const familyIndex =
      hasFamily || hasDeps ? stableFamilyIndex(rootTaskId) : -1

    const parent = task.parentTaskId ? byId.get(task.parentTaskId) : undefined

    map.set(task.taskId, {
      rootTaskId,
      familyIndex,
      parentTitle: parent?.title,
      childCount: children.length,
      siblingCount: siblings.length,
      blockedBy: getDependencyBlockersForStatus(task, byId, 'doing'),
      successors: succs,
      relatedIds: collectRelatedTaskIds(task.taskId, tasks, byId)
    })
  }

  return map
}
