import assert from 'node:assert/strict'
import enUS from '../src/renderer/src/i18n/locales/en-US.ts'
import zhCN from '../src/renderer/src/i18n/locales/zh-CN.ts'
import type { MessageKey } from '../src/renderer/src/i18n/types.ts'

const cjk = /[\u4e00-\u9fff]/

const enKeys = Object.keys(enUS) as MessageKey[]
const zhKeys = Object.keys(zhCN) as MessageKey[]

assert.equal(enKeys.length, zhKeys.length, 'en-US and zh-CN key count mismatch')

/** 语言切换下拉保留原生语言名 */
const CJK_ALLOWLIST = new Set<MessageKey>(['topbar.localeZh'])

const bad: string[] = []
for (const key of enKeys) {
  if (CJK_ALLOWLIST.has(key)) continue
  const value = enUS[key]
  if (value && cjk.test(value)) bad.push(key)
}

assert.ok(bad.length === 0, `en-US contains CJK: ${bad.slice(0, 8).join(', ')}`)

console.log(`verify:i18n-en OK (${enKeys.length} keys, no CJK in en-US values)`)
