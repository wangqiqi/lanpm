export type AiPatrolFindingKind = 'overdue' | 'behind' | 'attention'

export interface AiPatrolFinding {
  groupId: string
  groupName: string
  taskId: string
  title: string
  kind: AiPatrolFindingKind
  assigneeName?: string
  endDate?: string
  progressPercent?: number
}

export interface AiPatrolReport {
  runId: string
  startedAt: string
  finishedAt: string
  findings: AiPatrolFinding[]
  summary: string
  usedExternalAi: boolean
}

export interface AiPatrolRunSummary {
  runId: string
  startedAt: string
  finishedAt: string
  findingCount: number
  summary: string
  usedExternalAi: boolean
}
