import type { TaskDependency } from './dependency'

export type TaskStatus = 'todo' | 'doing' | 'done' | 'other'

export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  taskId: string
  groupId: string
  parentTaskId?: string
  title: string
  description?: string
  status: TaskStatus
  otherReason?: string
  priority: TaskPriority
  assigneeUserId?: string
  /** Independent board labels (≠ priority); omit or [] = none */
  tags?: string[]
  /** 从哪条聊天消息一键建任务（A2） */
  sourceMsgId?: string
  /** 挂到任务的群文件 id 列表（A2） */
  linkedFileIds?: string[]
  progressPercent: number
  startDate?: string
  endDate?: string
  milestone?: boolean
  sortOrder: number
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  /** 甘特依赖边（listTasks 时填充） */
  dependencies?: TaskDependency[]
}

export interface CreateTaskInput {
  groupId: string
  title: string
  parentTaskId?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeUserId?: string
  tags?: string[]
  sourceMsgId?: string
  linkedFileIds?: string[]
  progressPercent?: number
}

export interface UpdateTaskInput {
  taskId: string
  title?: string
  description?: string
  status?: TaskStatus
  otherReason?: string | null
  priority?: TaskPriority
  assigneeUserId?: string | null
  /** Set to replace tags; omit to leave unchanged; `[]` clears */
  tags?: string[]
  /** Set to replace; omit unchanged; `null` clears */
  sourceMsgId?: string | null
  /** Set to replace; omit unchanged; `[]` clears */
  linkedFileIds?: string[]
  progressPercent?: number
  parentTaskId?: string | null
  sortOrder?: number
  startDate?: string | null
  endDate?: string | null
  milestone?: boolean
}

export interface GanttScheduleInput {
  taskId: string
  startDate: string
  endDate: string
}

export interface MoveTaskInput {
  taskId: string
  status: TaskStatus
  sortOrder?: number
  otherReason?: string
}
