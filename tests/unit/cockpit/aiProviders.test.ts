import { describe, expect, it } from 'vitest'
import {
  AI_PROVIDER_PRESETS,
  DEFAULT_AI_PROVIDER,
  defaultAiProviderPreset,
  getAiProviderPreset
} from '@shared/cockpit/aiProviders'

describe('AI_PROVIDER_PRESETS', () => {
  it('lists deepseek first as default recommendation', () => {
    expect(AI_PROVIDER_PRESETS[0]?.value).toBe('deepseek')
  })
})

describe('getAiProviderPreset', () => {
  it('returns preset by provider id', () => {
    expect(getAiProviderPreset('qwen')?.model).toBe('qwen-plus')
  })

  it('returns undefined for unknown provider', () => {
    expect(getAiProviderPreset('unknown' as 'deepseek')).toBeUndefined()
  })
})

describe('defaultAiProviderPreset', () => {
  it('matches DEFAULT_AI_PROVIDER', () => {
    expect(DEFAULT_AI_PROVIDER).toBe('deepseek')
    expect(defaultAiProviderPreset().value).toBe('deepseek')
  })
})
