import { describe, expect, it } from 'vitest'
import { assembleAiPrompt, assertPromptDesensitized } from '../../../src/main/ai/aiPromptService.ts'

describe('aiPromptService desensitize', () => {
  it('assembles prompt without forbidden markers', () => {
    const prompt = assembleAiPrompt({
      history: [],
      userMessage: '请评审 #登录模块',
      taskPayloads: [
        {
          taskId: 't1',
          title: '登录模块',
          status: 'doing',
          progressPercent: 40,
          priority: 'high',
          startDate: '2026-01-01',
          endDate: '2026-02-01',
          descriptionSummary: '实现 OAuth'
        }
      ]
    })
    assertPromptDesensitized(prompt)
    expect(prompt.messages[0]?.content).toContain('登录模块')
    expect(JSON.stringify(prompt)).not.toContain('chat_history')
  })
})
