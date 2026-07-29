import { describe, expect, it } from 'vitest'
import { getPipelinePreset, AI_PIPELINE_PRESETS } from '../../../src/shared/ai/pipelinePresets.ts'

describe('pipelinePresets', () => {
  it('defines healthCheck with four steps', () => {
    const preset = getPipelinePreset('healthCheck')
    expect(preset.id).toBe('healthCheck')
    expect(preset.steps.map((s) => s.stepId)).toEqual([
      'gatherContext',
      'llmRiskSummary',
      'reviewTopTasks',
      'assembleReport'
    ])
  })

  it('registers healthCheck and taskRemediate presets', () => {
    expect(AI_PIPELINE_PRESETS.map((p) => p.id)).toEqual(['healthCheck', 'taskRemediate'])
  })
})
