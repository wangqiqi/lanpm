import type { AiProvider } from './types'

export interface AiProviderPreset {
  /** i18n MessageKey（renderer 侧 `t()` 解析） */
  labelKey: string
  value: AiProvider
  baseUrl: string
  model: string
  /** API Key 占位符 MessageKey */
  apiKeyPlaceholderKey?: string
}

/** 国内模型优先；DeepSeek 为默认推荐（OpenAI 兼容 /chat/completions） */
export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    labelKey: 'ai.provider.deepseek',
    value: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKeyPlaceholderKey: 'ai.provider.apiKey.deepseek'
  },
  {
    labelKey: 'ai.provider.qwen',
    value: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    apiKeyPlaceholderKey: 'ai.provider.apiKey.qwen'
  },
  {
    labelKey: 'ai.provider.zhipu',
    value: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    apiKeyPlaceholderKey: 'ai.provider.apiKey.zhipu'
  },
  {
    labelKey: 'ai.provider.moonshot',
    value: 'moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    apiKeyPlaceholderKey: 'ai.provider.apiKey.moonshot'
  },
  {
    labelKey: 'ai.provider.openai',
    value: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  },
  {
    labelKey: 'ai.provider.anthropic',
    value: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-latest'
  },
  {
    labelKey: 'ai.provider.custom',
    value: 'custom',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  }
]

export const DEFAULT_AI_PROVIDER: AiProvider = 'deepseek'

export function getAiProviderPreset(provider: AiProvider): AiProviderPreset | undefined {
  return AI_PROVIDER_PRESETS.find((p) => p.value === provider)
}

export function defaultAiProviderPreset(): AiProviderPreset {
  return getAiProviderPreset(DEFAULT_AI_PROVIDER) ?? AI_PROVIDER_PRESETS[0]
}
