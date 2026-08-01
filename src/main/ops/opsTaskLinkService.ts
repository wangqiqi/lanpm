import type { Database } from 'better-sqlite3'
import { TASK_DESCRIPTION_MAX_LENGTH } from '../../shared/task/validation.ts'
import { getTaskById } from '../storage/repositories/taskRepository.ts'
import { updateGroupTask } from '../task/taskService.ts'

const OPS_NOTE_SEP = '\n\n---\n'

/** 在任务 description 末尾追加 ops 活动注记（限长） */
export function appendTaskOpsNote(db: Database, taskId: string, line: string): void {
  const task = getTaskById(db, taskId)
  if (!task || task.deletedAt) return
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const note = `[ops ${stamp}] ${line.trim()}`
  const base = task.description?.trim() ?? ''
  const combined = base ? `${base}${OPS_NOTE_SEP}${note}` : note
  updateGroupTask(db, {
    taskId,
    description: combined.slice(0, TASK_DESCRIPTION_MAX_LENGTH)
  })
}
