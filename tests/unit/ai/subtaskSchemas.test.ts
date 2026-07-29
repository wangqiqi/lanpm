import { describe, expect, it } from 'vitest'
import {
  aiSubtaskProposalListSchema,
  parseAiSubtaskLlmJson
} from '../../../src/shared/ai/subtaskSchemas.ts'

describe('subtaskSchemas', () => {
  it('parses valid LLM JSON envelope', () => {
    const proposals = parseAiSubtaskLlmJson(
      JSON.stringify({
        subtasks: [
          { title: '实现登录 API', suggestedEndDate: '2026-08-01' },
          { title: '编写单元测试', rationale: '覆盖核心路径' }
        ]
      })
    )
    expect(proposals).toHaveLength(2)
    expect(proposals[0]?.title).toBe('实现登录 API')
  })

  it('extracts JSON from markdown fence', () => {
    const proposals = parseAiSubtaskLlmJson(
      '说明文字\n```json\n{"subtasks":[{"title":"子任务 A"}]}\n```'
    )
    expect(proposals).toHaveLength(1)
    expect(proposals[0]?.title).toBe('子任务 A')
  })

  it('rejects empty title', () => {
    expect(() =>
      aiSubtaskProposalListSchema.parse([{ title: '' }])
    ).toThrow()
  })

  it('rejects more than 20 proposals', () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ title: `T${i}` }))
    expect(() => aiSubtaskProposalListSchema.parse(many)).toThrow()
  })
})
