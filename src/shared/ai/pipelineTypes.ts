import type { AiConfirmSubtaskItem } from './subtaskSchemas.ts'
import type { AiSubtaskProposal, AiProposeSubtasksErrorCode } from './subtaskSchemas.ts'

export type AiPipelinePresetId = 'healthCheck' | 'taskRemediate'

export type AiPipelineRunStatus = 'running' | 'awaiting_confirm' | 'completed' | 'failed'

export type AiPipelineStepId =
  | 'gatherContext'
  | 'llmRiskSummary'
  | 'reviewTopTasks'
  | 'assembleReport'
  | 'proposeSubtasks'
  | 'confirmSubtasks'

export type AiPipelineStepStatus = 'ok' | 'degraded' | 'failed' | 'awaiting_confirm'

export interface AiPipelineStepResult {
  stepId: AiPipelineStepId
  status: AiPipelineStepStatus
  startedAt: string
  finishedAt: string
  summary?: string
  errorCode?: string
}

export interface AiPipelinePendingConfirm {
  parentTaskId: string
  parentTaskTitle: string
  proposals: AiSubtaskProposal[]
  usedExternalAi: boolean
  degraded?: boolean
  errorCode?: AiProposeSubtasksErrorCode
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
  pendingConfirm: AiPipelinePendingConfirm | null
  createdTaskIds: string[]
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
  /** Required for `taskRemediate`. */
  parentTaskId?: string
}

export interface AiResumePipelineInput {
  runId: string
  items: AiConfirmSubtaskItem[]
}

export interface AiCancelPipelineInput {
  runId: string
}

export interface AiPipelinePresetStepDef {
  stepId: AiPipelineStepId
  labelKey: string
  /** When true, runner pauses after this step until human confirms via resumePipeline. */
  requiresHumanConfirm?: boolean
}

export interface AiPipelinePresetDef {
  id: AiPipelinePresetId
  steps: readonly AiPipelinePresetStepDef[]
}
