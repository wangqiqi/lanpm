export type ProjectHealth = 'normal' | 'risk' | 'delayed'

export interface CockpitSummary {
  totalProjects: number
  inProgressCount: number
  delayedCount: number
  /** 健康状态为 risk 的项目数（领导 KPI） */
  riskProjectCount: number
}

export interface ProjectDashboardItem {
  groupId: string
  name: string
  progressPercent: number
  status: ProjectHealth
  inProgressCount: number
  delayedCount: number
  totalTasks: number
}

export interface DepartmentStats {
  department: string
  completionPercent: number
  taskCount: number
}

export interface CockpitDashboard {
  summary: CockpitSummary
  /** 领导首屏执行摘要（CK-403） */
  executiveSummary: ExecutiveSummary
  projects: ProjectDashboardItem[]
  departments: DepartmentStats[]
}

/** 领导首屏执行摘要 */
export interface ExecutiveSummary {
  completedThisWeek: number
  inProgressCount: number
  riskProjectCount: number
  dueNextWeek: number
}

export type AiProvider =
  | 'deepseek'
  | 'qwen'
  | 'zhipu'
  | 'moonshot'
  | 'openai'
  | 'anthropic'
  | 'custom'

export interface AiConfigView {
  provider: AiProvider
  baseUrl: string
  model: string
  enabled: boolean
  dataPolicy: 'desensitized-only'
  hasApiKey: boolean
}

export interface AiConfigInput {
  provider: AiProvider
  apiKey?: string
  baseUrl: string
  model: string
  enabled: boolean
}

export interface AiTaskAuditPayload {
  taskId: string
  title: string
  status: string
  progressPercent: number
  priority: string
  startDate?: string
  endDate?: string
  descriptionSummary?: string
}

export interface AiReportResult {
  format: 'markdown'
  content: string
  generatedAt: string
  usedExternalAi: boolean
}
