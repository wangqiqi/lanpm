import type { AiPipelinePendingConfirm, AiPipelineStepResult } from './pipelineTypes.ts'

/** Serialized shape stored in `ai_pipeline_runs.steps_json`. */
export interface AiPipelineStepsPayload {
  steps: AiPipelineStepResult[]
  pendingConfirm?: AiPipelinePendingConfirm | null
  createdTaskIds?: string[]
}

export function serializePipelineStepsPayload(payload: AiPipelineStepsPayload): string {
  return JSON.stringify(payload)
}

export function parsePipelineStepsPayload(json: string): AiPipelineStepsPayload {
  try {
    const parsed = JSON.parse(json) as unknown
    if (Array.isArray(parsed)) {
      return { steps: parsed as AiPipelineStepResult[], pendingConfirm: null, createdTaskIds: [] }
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as AiPipelineStepsPayload).steps)) {
      const p = parsed as AiPipelineStepsPayload
      return {
        steps: p.steps,
        pendingConfirm: p.pendingConfirm ?? null,
        createdTaskIds: p.createdTaskIds ?? []
      }
    }
  } catch {
    /* fall through */
  }
  return { steps: [], pendingConfirm: null, createdTaskIds: [] }
}
