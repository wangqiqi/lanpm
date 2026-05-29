/**
 * v1.1 global search + AI provider presets smoke.
 * Run: npm run verify:search
 */
import assert from 'node:assert/strict'
import { extractMessageText } from '../../src/shared/search/extractMessageText.ts'
import {
  AI_PROVIDER_PRESETS,
  DEFAULT_AI_PROVIDER,
  defaultAiProviderPreset
} from '../../src/shared/cockpit/aiProviders.ts'

assert.equal(extractMessageText({ kind: 'text', text: 'hello world' }), 'hello world')
assert.equal(
  extractMessageText({ kind: 'code', language: 'python', code: 'print(1)' }),
  'print(1)'
)
assert.equal(
  extractMessageText({ kind: 'task_ref', taskId: 't1', title: 'Fix bug' }),
  'Fix bug'
)

assert.equal(DEFAULT_AI_PROVIDER, 'deepseek')
const deepseek = AI_PROVIDER_PRESETS.find((p) => p.value === 'deepseek')
assert.ok(deepseek)
assert.equal(deepseek?.baseUrl, 'https://api.deepseek.com/v1')
assert.equal(deepseek?.model, 'deepseek-chat')
assert.equal(defaultAiProviderPreset().value, 'deepseek')
assert.ok(AI_PROVIDER_PRESETS.some((p) => p.value === 'qwen'))
assert.ok(AI_PROVIDER_PRESETS.some((p) => p.value === 'zhipu'))

console.log('verify-search: ok')
