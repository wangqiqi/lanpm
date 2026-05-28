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
  progressPercent: number
  startDate?: string
  endDate?: string
  milestone?: boolean
  sortOrder: number
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface CreateTaskInput {
  groupId: string
  title: string
  parentTaskId?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeUserId?: string
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
  progressPercent?: number
  parentTaskId?: string | null
  sortOrder?: number
}

export interface MoveTaskInput {
  taskId: string
  status: TaskStatus
  sortOrder?: number
  otherReason?: string
}
