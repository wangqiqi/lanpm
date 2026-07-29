import type { AiPipelinePresetDef, AiPipelinePresetId } from './pipelineTypes.ts'

export const AI_PIPELINE_PRESETS: readonly AiPipelinePresetDef[] = [
  {
    id: 'healthCheck',
    steps: [
      { stepId: 'gatherContext', labelKey: 'ai.pipeline.step.gatherContext' },
      { stepId: 'llmRiskSummary', labelKey: 'ai.pipeline.step.llmRiskSummary' },
      { stepId: 'reviewTopTasks', labelKey: 'ai.pipeline.step.reviewTopTasks' },
      { stepId: 'assembleReport', labelKey: 'ai.pipeline.step.assembleReport' }
    ]
  },
  {
    id: 'taskRemediate',
    steps: [
      { stepId: 'gatherContext', labelKey: 'ai.pipeline.step.gatherContext' },
      {
        stepId: 'proposeSubtasks',
        labelKey: 'ai.pipeline.step.proposeSubtasks',
        requiresHumanConfirm: true
      },
      { stepId: 'confirmSubtasks', labelKey: 'ai.pipeline.step.confirmSubtasks' },
      { stepId: 'assembleReport', labelKey: 'ai.pipeline.step.assembleReport' }
    ]
  }
] as const

export function getPipelinePreset(presetId: AiPipelinePresetId): AiPipelinePresetDef {
  const preset = AI_PIPELINE_PRESETS.find((p) => p.id === presetId)
  if (!preset) throw new Error(`Unknown pipeline preset: ${presetId}`)
  return preset
}

export function stepRequiresHumanConfirm(
  presetId: AiPipelinePresetId,
  stepId: AiPipelinePresetDef['steps'][number]['stepId']
): boolean {
  const preset = getPipelinePreset(presetId)
  const step = preset.steps.find((s) => s.stepId === stepId)
  return step?.requiresHumanConfirm === true
}
