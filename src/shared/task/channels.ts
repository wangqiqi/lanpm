/** Renderer push when tasks in a group change */
export const TASK_PUSH_CHANNEL = 'task:changed'

export const TASK_IPC = {
  listTasks: 'task:listTasks',
  createTask: 'task:createTask',
  updateTask: 'task:updateTask',
  moveTask: 'task:moveTask',
  createFromChat: 'task:createFromChat'
} as const
