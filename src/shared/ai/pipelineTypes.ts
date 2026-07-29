export type AiPipelinePresetId = 'healthCheck'

export type AiPipelineRunStatus = 'running' | 'completed' | 'failed'

export type AiPipelineStepId =
  | 'gatherContext'
  | 'llmRiskSummary'
  | 'reviewTopTasks'
  | 'assembleReport'

export type AiPipelineStepStatus = 'ok' | 'degraded' | 'failed'

export interface AiPipelineStepResult {
  stepId: AiPipelineStepId
  status: AiPipelineStepStatus
  startedAt: string
  finishedAt: string
  summary?: string
  errorCode?: string
}

export interface AiPipelineRun {
  runId: string
  userId: string
  groupId: string
  presetId: AiPipelinePresetId
  status: AiPipelineRunStatus
  startedAt: string
  finishedAt: string | null
  steps: AiPipelineStepResult[]
  finalMarkdown: string | null
  usedExternalAi: boolean
  degraded: boolean
}

export interface AiPipelineRunSummary {
  runId: string
  presetId: AiPipelinePresetId
  groupId: string
  status: AiPipelineRunStatus
  startedAt: string
  finishedAt: string | null
  usedExternalAi: boolean
  degraded: boolean
}

export interface AiStartPipelineInput {
  groupId: string
  presetId: AiPipelinePresetId
}

export interface AiPipelinePresetStepDef {
  stepId: AiPipelineStepId
  labelKey: string
}

export interface AiPipelinePresetDef {
  id: AiPipelinePresetId
  steps: readonly AiPipelinePresetStepDef[]
}
