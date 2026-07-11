/** 群组类型（对齐 docs/01 §11.1、docs/05 §2） */
export type GroupType = 'project' | 'function' | 'anonymous'

export type AppView = 'chat' | 'board' | 'tree' | 'gantt' | 'calendar' | 'files'

export interface NavGroup {
  groupId: string
  name: string
  type: GroupType
  createdBy: string
  /** ISO；排序回退用 */
  createdAt?: string
}
