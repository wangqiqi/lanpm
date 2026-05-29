import type { TaskStatus } from './types'

/** 看板列 UI 标题（docs/04 §3.4） */
export const KANBAN_COLUMN_LABELS: Record<TaskStatus, string> = {
  todo: 'TODO',
  doing: 'IN PROGRESS',
  done: 'DONE',
  other: 'OTHER'
}

export const KANBAN_COLUMN_ORDER: TaskStatus[] = ['todo', 'doing', 'done', 'other']

export function isTaskStatus(value: string): value is TaskStatus {
  return value === 'todo' || value === 'doing' || value === 'done' || value === 'other'
}

/** 看板拖放删除区 droppable id（`BoardView`） */
export const KANBAN_TRASH_DROP_ID = 'kanban-trash'

export function isKanbanTrashDropId(value: string): boolean {
  return value === KANBAN_TRASH_DROP_ID
}
