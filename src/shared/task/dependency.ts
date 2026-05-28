/** docs/04 §3.4 TaskDependency */
export type TaskDependencyType = 'FS' | 'SS' | 'FF' | 'SF'

export interface TaskDependency {
  fromTaskId: string
  toTaskId: string
  type: TaskDependencyType
}

export interface UpsertDependencyInput {
  groupId: string
  fromTaskId: string
  toTaskId: string
  type: TaskDependencyType
}
