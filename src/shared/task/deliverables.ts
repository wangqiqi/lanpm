import type { Task } from './types.ts'
import { normalizeLinkedFileIds } from './linkedFiles.ts'

/** Minimal task fields needed to derive file↔task indexes. */
export type TaskDeliverableSource = Pick<
  Task,
  'taskId' | 'title' | 'linkedFileIds' | 'deletedAt'
>

export interface TaskLinkRef {
  taskId: string
  title: string
}

export interface DeliverableIndex {
  /** fileId → linked task ids (order = first-seen task order) */
  fileToTaskIds: Map<string, string[]>
  /** fileId → { taskId, title } for UI chips */
  fileToTasks: Map<string, TaskLinkRef[]>
  /** taskId → normalized linked file ids */
  taskToFileIds: Map<string, string[]>
}

/**
 * Build bidirectional indexes from Task.linkedFileIds (A3 · derived, no files-table column).
 * Soft-deleted tasks are skipped.
 */
export function buildDeliverableIndex(tasks: TaskDeliverableSource[]): DeliverableIndex {
  const fileToTaskIds = new Map<string, string[]>()
  const fileToTasks = new Map<string, TaskLinkRef[]>()
  const taskToFileIds = new Map<string, string[]>()
  const seenFileTask = new Map<string, Set<string>>()

  for (const task of tasks) {
    if (task.deletedAt) continue
    const fileIds = normalizeLinkedFileIds(task.linkedFileIds ?? [])
    taskToFileIds.set(task.taskId, fileIds)
    const ref: TaskLinkRef = { taskId: task.taskId, title: task.title }
    for (const fileId of fileIds) {
      let idList = fileToTaskIds.get(fileId)
      let refList = fileToTasks.get(fileId)
      let seen = seenFileTask.get(fileId)
      if (!idList) {
        idList = []
        refList = []
        seen = new Set()
        fileToTaskIds.set(fileId, idList)
        fileToTasks.set(fileId, refList!)
        seenFileTask.set(fileId, seen)
      }
      if (seen!.has(task.taskId)) continue
      seen!.add(task.taskId)
      idList.push(task.taskId)
      refList!.push(ref)
    }
  }

  return { fileToTaskIds, fileToTasks, taskToFileIds }
}

export function isDeliverableFile(
  fileId: string,
  fileToTaskIds: Map<string, string[]>
): boolean {
  const ids = fileToTaskIds.get(fileId)
  return ids != null && ids.length > 0
}

/** Keep only files linked to ≥1 non-deleted task. */
export function filterDeliverableFiles<T extends { fileId: string }>(
  files: T[],
  fileToTaskIds: Map<string, string[]>
): T[] {
  return files.filter((f) => isDeliverableFile(f.fileId, fileToTaskIds))
}

/** Keep files linked to a specific task. */
export function filterFilesByTaskId<T extends { fileId: string }>(
  files: T[],
  taskId: string,
  taskToFileIds: Map<string, string[]>
): T[] {
  const linked = taskToFileIds.get(taskId)
  if (!linked || linked.length === 0) return []
  const set = new Set(linked)
  return files.filter((f) => set.has(f.fileId))
}

export function tasksForFile(
  fileId: string,
  fileToTasks: Map<string, TaskLinkRef[]>
): TaskLinkRef[] {
  return fileToTasks.get(fileId) ?? []
}
