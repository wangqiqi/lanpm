import type { AiProvider } from './types'

export interface AiProviderPreset {
  label: string
  value: AiProvider
  baseUrl: string
  model: string
  /** API Key 输入框占位提示 */
  apiKeyPlaceholder?: string
}

/** 国内模型优先；DeepSeek 为默认推荐（OpenAI 兼容 /chat/completions） */
export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    label: 'DeepSeek（推荐）',
    value: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKeyPlaceholder: 'sk-...（platform.deepseek.com）'
  },
  {
    label: '通义千问 · DashScope',
    value: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    apiKeyPlaceholder: 'sk-...（阿里云百炼）'
  },
  {
    label: '智谱 GLM',
    value: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    apiKeyPlaceholder: '...（open.bigmodel.cn）'
  },
  {
    label: 'Moonshot · Kimi',
    value: 'moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    apiKeyPlaceholder: 'sk-...（platform.moonshot.cn）'
  },
  {
    label: 'OpenAI',
    value: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  },
  {
    label: 'Anthropic',
    value: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-latest'
  },
  {
    label: '自定义',
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
