/**
 * TASK-1607 — Extension API v0.6 chat.sendMarkdown + ai.getThread + ai.streamChat guards.
 * Run: npm run verify:extension-api-v0.6
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'
import { PLUGIN_CAPABILITY_IDS } from '../../src/shared/plugin/types.ts'
import {
  HUMAN_REVIEW_CAPABILITY_IDS,
  isCapabilityPendingConfirm,
  isHumanReviewCapability
} from '../../src/shared/plugin/capabilityConfirm.ts'
import {
  CHAT_SEND_MARKDOWN_WHITELIST_FIELDS,
  parseChatSendMarkdownInput
} from '../../src/shared/plugin/chatSendMarkdownWhitelist.ts'
import {
  AI_GET_THREAD_WHITELIST_FIELDS,
  parseAiGetThreadInput
} from '../../src/shared/plugin/aiGetThreadWhitelist.ts'
import {
  AI_STREAM_CHAT_WHITELIST_FIELDS,
  parseAiStreamChatCapabilityInput
} from '../../src/shared/plugin/aiStreamChatWhitelist.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

for (const cap of ['chat.sendMarkdown', 'ai.getThread', 'ai.streamChat'] as const) {
  assert.ok(PLUGIN_CAPABILITY_IDS.includes(cap), `PLUGIN_CAPABILITY_IDS missing ${cap}`)
}

assert.ok(isHumanReviewCapability('chat.sendMarkdown'), 'chat.sendMarkdown human review')
assert.ok(isHumanReviewCapability('ai.streamChat'), 'ai.streamChat human review')
assert.equal(isHumanReviewCapability('ai.getThread'), false)

assert.deepEqual([...HUMAN_REVIEW_CAPABILITY_IDS], [
  'task.create',
  'task.patch',
  'board.moveTask',
  'chat.sendText',
  'chat.sendMarkdown',
  'ai.streamChat',
  'file.upload',
  'ops.command.send',
  'chat.sendTaskRef',
  'media.livekit.createToken'
])

assert.deepEqual(CHAT_SEND_MARKDOWN_WHITELIST_FIELDS, ['groupId', 'markdown', 'replyToMsgId'])
assert.equal(parseChatSendMarkdownInput({ groupId: 'g1', markdown: '# hi' }).ok, true)
assert.equal(parseChatSendMarkdownInput({ groupId: 'g1', markdown: '' }).ok, false)

assert.deepEqual(AI_GET_THREAD_WHITELIST_FIELDS, ['threadId'])
assert.equal(parseAiGetThreadInput({ threadId: 'aith_1' }).ok, true)
assert.equal(parseAiGetThreadInput({}).ok, false)

assert.deepEqual(AI_STREAM_CHAT_WHITELIST_FIELDS, [
  'userMessage',
  'threadId',
  'groupId',
  'taskIds',
  'createThreadTitle'
])
assert.equal(parseAiStreamChatCapabilityInput({ userMessage: 'hello' }).ok, true)
assert.equal(parseAiStreamChatCapabilityInput({ userMessage: '' }).ok, false)

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
assert.match(proxy, /case 'chat\.sendMarkdown':/)
assert.match(proxy, /sendMarkdownMessage/)
assert.match(proxy, /case 'ai\.getThread':/)
assert.match(proxy, /pending\.capability === 'ai\.streamChat'/)
assert.match(proxy, /runAiStreamChat/)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
assert.match(stub, /chat\.sendMarkdown/)
assert.match(stub, /ai\.getThread/)
assert.match(stub, /ai\.streamChat/)

const aiAssistantManifest = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.ai-assistant/plugin.json'), 'utf8')
)
const aiParsed = parsePluginManifest(aiAssistantManifest)
assert.equal(aiParsed?.id, 'lanpm.ai-assistant')
assert.ok(aiParsed?.capabilities.includes('chat.sendMarkdown'))
assert.ok(aiParsed?.capabilities.includes('ai.getThread'))
assert.ok(aiParsed?.capabilities.includes('ai.streamChat'))

const docs = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')
assert.match(docs, /v0\.6/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  version?: string
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:extension-api-v0.6'], 'missing verify:extension-api-v0.6 script')

assert.ok(
  isCapabilityPendingConfirm({
    status: 'pending_confirm',
    pendingId: 'pend_x',
    capability: 'chat.sendMarkdown',
    pluginId: 'lanpm.ai-assistant'
  })
)

const unit = join(root, 'tests/unit/plugin/capabilityConfirm.test.ts')
assert.ok(existsSync(unit), 'missing capabilityConfirm unit test')

console.log('verify:extension-api-v0.6 OK')
