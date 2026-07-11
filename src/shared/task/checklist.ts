/** P1-3 轻量验收清单（挂 taskId） */

export interface ChecklistProgress {
  done: number
  total: number
}

export interface TaskChecklist {
  checklistId: string
  taskId: string
  groupId: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ChecklistItem {
  itemId: string
  checklistId: string
  taskId: string
  text: string
  done: boolean
  sortOrder: number
  /** 由检查项一键建出的子任务（TASK-238） */
  linkedSubtaskId?: string
  createdAt: string
  updatedAt: string
}

export interface ChecklistView {
  checklist: TaskChecklist | null
  items: ChecklistItem[]
  progress: ChecklistProgress
}

export interface UpsertChecklistItemInput {
  groupId: string
  taskId: string
  /** omit = create */
  itemId?: string
  text: string
  done?: boolean
  sortOrder?: number
  linkedSubtaskId?: string | null
}

export function checklistProgressOf(items: Pick<ChecklistItem, 'done'>[]): ChecklistProgress {
  const total = items.length
  const done = items.filter((i) => i.done).length
  return { done, total }
}
