import { describe, expect, it } from 'vitest'
import {
  parsePipelineStepsPayload,
  serializePipelineStepsPayload
} from '../../../src/shared/ai/pipelineStepsPayload.ts'
import { getPipelinePreset, stepRequiresHumanConfirm } from '../../../src/shared/ai/pipelinePresets.ts'

describe('pipelineStepsPayload', () => {
  it('round-trips pending confirm and created task ids', () => {
    const json = serializePipelineStepsPayload({
      steps: [
        {
          stepId: 'proposeSubtasks',
          status: 'awaiting_confirm',
          startedAt: '2026-07-29T00:00:00.000Z',
          finishedAt: '2026-07-29T00:00:01.000Z'
        }
      ],
      pendingConfirm: {
        parentTaskId: 'task_1',
        parentTaskTitle: 'Parent',
        proposals: [{ title: 'Child A' }],
        usedExternalAi: true
      },
      createdTaskIds: ['task_2']
    })
    const parsed = parsePipelineStepsPayload(json)
    expect(parsed.steps).toHaveLength(1)
    expect(parsed.pendingConfirm?.parentTaskId).toBe('task_1')
    expect(parsed.createdTaskIds).toEqual(['task_2'])
  })

  it('parses legacy array-only steps_json', () => {
    const legacy = JSON.stringify([
      {
        stepId: 'gatherContext',
        status: 'ok',
        startedAt: 't0',
        finishedAt: 't1'
      }
    ])
    const parsed = parsePipelineStepsPayload(legacy)
    expect(parsed.steps).toHaveLength(1)
    expect(parsed.pendingConfirm).toBeNull()
  })
})

describe('pipelinePresets taskRemediate', () => {
  it('defines taskRemediate with human confirm on proposeSubtasks', () => {
    const preset = getPipelinePreset('taskRemediate')
    expect(preset.steps.map((s) => s.stepId)).toEqual([
      'gatherContext',
      'proposeSubtasks',
      'confirmSubtasks',
      'assembleReport'
    ])
    expect(stepRequiresHumanConfirm('taskRemediate', 'proposeSubtasks')).toBe(true)
    expect(stepRequiresHumanConfirm('healthCheck', 'gatherContext')).toBe(false)
  })
})
