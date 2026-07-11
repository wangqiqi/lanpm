/** Renderer push when tasks in a group change */
export const TASK_PUSH_CHANNEL = 'task:changed'

/** Renderer push when remote focus Presence changes */
export const TASK_AWARENESS_PUSH_CHANNEL = 'task:awareness'

/** Renderer push when group tag dictionary changes */
export const GROUP_TAG_META_PUSH_CHANNEL = 'group:tagMetaChanged'

export const TASK_IPC = {
  listTasks: 'task:listTasks',
  createTask: 'task:createTask',
  updateTask: 'task:updateTask',
  moveTask: 'task:moveTask',
  createFromChat: 'task:createFromChat',
  referenceFromChat: 'task:referenceFromChat',
  listDiscussions: 'task:listDiscussions',
  listChecklist: 'task:listChecklist',
  upsertChecklistItem: 'task:upsertChecklistItem',
  toggleChecklistItem: 'task:toggleChecklistItem',
  removeChecklistItem: 'task:removeChecklistItem',
  updateSchedule: 'task:updateSchedule',
  upsertDependency: 'task:upsertDependency',
  removeDependency: 'task:removeDependency',
  deleteTask: 'task:deleteTask',
  setAwareness: 'task:setAwareness',
  listAwareness: 'task:listAwareness',
  listGroupTags: 'task:listGroupTags',
  upsertGroupTag: 'task:upsertGroupTag',
  removeGroupTag: 'task:removeGroupTag',
  importLocalTagColors: 'task:importLocalTagColors'
} as const

export type TaskDeleteIpcArgs = {
  taskId: string
  mode?: import('./deleteMode').DeleteTaskMode
}
