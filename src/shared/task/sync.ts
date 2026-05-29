import type { Task } from './types'

export type TaskPatchAction = 'upsert' | 'delete'

/** docs/04 — task_patch payload（LWW by updatedAt；Yjs 见 task_crdt post-v1.1） */
export interface TaskPatchPayload {
  action: TaskPatchAction
  task: Task
}
