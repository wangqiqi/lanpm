/** Renderer push when tasks in a group change */
export const TASK_PUSH_CHANNEL = 'task:changed'

/** Renderer push when remote focus Presence changes */
export const TASK_AWARENESS_PUSH_CHANNEL = 'task:awareness'

export const TASK_IPC = {
  listTasks: 'task:listTasks',
  createTask: 'task:createTask',
  updateTask: 'task:updateTask',
  moveTask: 'task:moveTask',
  createFromChat: 'task:createFromChat',
  referenceFromChat: 'task:referenceFromChat',
  updateSchedule: 'task:updateSchedule',
  upsertDependency: 'task:upsertDependency',
  removeDependency: 'task:removeDependency',
  deleteTask: 'task:deleteTask',
  setAwareness: 'task:setAwareness',
  listAwareness: 'task:listAwareness'
} as const

export type TaskDeleteIpcArgs = {
  taskId: string
  mode?: import('./deleteMode').DeleteTaskMode
}
