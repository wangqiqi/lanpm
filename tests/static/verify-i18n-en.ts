import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import enUS from '../../src/renderer/src/i18n/locales/en-US.ts'
import zhCN from '../../src/renderer/src/i18n/locales/zh-CN.ts'
import type { MessageKey } from '../../src/renderer/src/i18n/types.ts'
import { projectRoot } from '../projectRoot.ts'

const cjk = /[\u4e00-\u9fff]/
const root = projectRoot

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

/** TASK-1229 — cockpit / chat 关键页英文布局：工具栏标签长度 + 视图 i18n + CSS 折行 */
const LAYOUT_INLINE_KEYS: MessageKey[] = [
  'nav.files',
  'nav.whiteboard',
  'nav.mindmap',
  'nav.chat',
  'nav.board',
  'chat.collaborationFullscreen',
  'chat.inputModeText',
  'chat.inputModeVoice',
  'cockpit.title',
  'cockpit.totalProjects',
  'cockpit.execSummaryTitle',
  'cockpit.attentionTitle',
  'cockpit.attentionOpenBoard'
]

const MAX_INLINE_LABEL_LEN = 52

for (const key of LAYOUT_INLINE_KEYS) {
  const value = enUS[key]
  assert.ok(value?.trim(), `${key} must have non-empty en-US`)
  assert.ok(
    value.length <= MAX_INLINE_LABEL_LEN,
    `${key} en-US too long for inline UI (${value.length}>${MAX_INLINE_LABEL_LEN}): ${value}`
  )
}

const chatView = readFileSync(
  join(root, 'src/renderer/src/features/chat/ChatView.tsx'),
  'utf8'
)
const cockpitView = readFileSync(join(root, 'src/renderer/src/views/CockpitView.tsx'), 'utf8')
const chatCss = readFileSync(
  join(root, 'src/renderer/src/features/chat/chat.module.css'),
  'utf8'
)
const cockpitCss = readFileSync(
  join(root, 'src/renderer/src/views/CockpitView.module.css'),
  'utf8'
)

assert.match(chatView, /useI18n\(\)/, 'ChatView must use i18n')
assert.match(chatView, /t\(['"]nav\.files['"]\)/, 'ChatView collaboration must use nav.files i18n')
assert.match(chatView, /data-visual-collab/, 'ChatView must expose collaboration visual hooks')

assert.match(cockpitView, /useI18n\(\)/, 'CockpitView must use i18n')
assert.match(cockpitView, /t\(['"]cockpit\./, 'CockpitView must use cockpit.* keys')

assert.match(
  chatCss,
  /\.toolbarCollaborationGroup/,
  'chat.module.css must style collaboration toolbar group'
)
assert.match(
  chatCss,
  /\.dmSessionPreview[\s\S]*text-overflow:\s*ellipsis/,
  'chat DM preview must ellipsis for long EN labels'
)
assert.match(
  chatCss,
  /\.bubble[\s\S]*word-break:\s*break-word/,
  'chat bubble must wrap long EN content'
)

assert.match(
  cockpitCss,
  /\.projectMetaInline[\s\S]*text-overflow:\s*ellipsis/,
  'cockpit project meta must ellipsis long EN titles'
)
assert.match(
  cockpitCss,
  /\.reportPre[\s\S]*word-break:\s*break-word/,
  'cockpit report output must wrap long EN paragraphs'
)

console.log(
  `verify:i18n-en OK (${enKeys.length} keys, no CJK; layout guards: ${LAYOUT_INLINE_KEYS.length} inline keys)`
)
