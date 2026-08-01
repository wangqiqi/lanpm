/**
 * TASK-1077 — Extension API v0.5 chat.sendText + file.upload guards.
 * Run: npm run verify:extension-api-v0.5
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
  CHAT_SEND_TEXT_MAX_LENGTH,
  CHAT_SEND_TEXT_WHITELIST_FIELDS,
  getDisallowedChatSendTextFields,
  parseChatSendTextInput
} from '../../src/shared/plugin/chatSendTextWhitelist.ts'
import {
  FILE_UPLOAD_MAX_BYTES,
  FILE_UPLOAD_WHITELIST_FIELDS,
  getDisallowedFileUploadFields,
  parseFileUploadInput
} from '../../src/shared/plugin/fileUploadWhitelist.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

for (const cap of ['chat.sendText', 'file.upload'] as const) {
  assert.ok(PLUGIN_CAPABILITY_IDS.includes(cap), `PLUGIN_CAPABILITY_IDS missing ${cap}`)
  assert.ok(isHumanReviewCapability(cap), `expected human review: ${cap}`)
}

assert.deepEqual([...HUMAN_REVIEW_CAPABILITY_IDS], [
  'task.create',
  'task.patch',
  'board.moveTask',
  'chat.sendText',
  'file.upload'
])
assert.equal(isHumanReviewCapability('chat.sendTaskRef'), false)

assert.deepEqual(CHAT_SEND_TEXT_WHITELIST_FIELDS, ['groupId', 'text', 'replyToMsgId'])
assert.deepEqual(getDisallowedChatSendTextFields({ groupId: 'g', text: 'hi', extra: 1 }), [
  'extra'
])
assert.equal(parseChatSendTextInput({ groupId: 'g1', text: 'Hello' }).ok, true)
assert.equal(parseChatSendTextInput({ groupId: 'g1', text: '' }).ok, false)
assert.equal(
  parseChatSendTextInput({ groupId: 'g1', text: 'x'.repeat(CHAT_SEND_TEXT_MAX_LENGTH + 1) }).ok,
  false
)

assert.deepEqual(FILE_UPLOAD_WHITELIST_FIELDS, ['groupId', 'sourcePath'])
assert.deepEqual(getDisallowedFileUploadFields({ groupId: 'g', sourcePath: '/a', mode: 'r' }), [
  'mode'
])
assert.equal(parseFileUploadInput({ groupId: 'g1', sourcePath: '/tmp/x.txt' }).ok, true)
assert.equal(parseFileUploadInput({ groupId: 'g1' }).ok, false)
assert.ok(FILE_UPLOAD_MAX_BYTES > 0)

assert.ok(
  existsSync(join(root, 'src/shared/plugin/chatSendTextWhitelist.ts')),
  'missing chatSendTextWhitelist.ts'
)
assert.ok(
  existsSync(join(root, 'src/shared/plugin/fileUploadWhitelist.ts')),
  'missing fileUploadWhitelist.ts'
)
assert.ok(
  existsSync(join(root, 'docs/specs/004-extension-api-v0.5/spec.md')),
  'missing v0.5 spec'
)

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
assert.match(proxy, /case 'chat\.sendText':/)
assert.match(proxy, /case 'file\.upload':/)
assert.match(proxy, /sendTextMessage/)
assert.match(proxy, /uploadFileFromPath/)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
assert.match(stub, /chat\.sendText/)
assert.match(stub, /file\.upload/)

const exampleStub = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/ExampleStub.tsx'),
  'utf8'
)
assert.match(exampleStub, /invokeCapabilityWithHumanConfirm/)
assert.match(exampleStub, /chat\.sendText/)
assert.match(exampleStub, /file\.upload/)

const exampleManifest = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.example/plugin.json'), 'utf8')
)
const parsed = parsePluginManifest(exampleManifest)
assert.equal(parsed?.id, 'lanpm.example')
assert.ok(parsed?.capabilities.includes('chat.sendText'), 'lanpm.example missing chat.sendText')
assert.ok(parsed?.capabilities.includes('file.upload'), 'lanpm.example missing file.upload')
assert.equal(exampleManifest.version, '0.5.0')

const docs = readFileSync(join(root, 'docs/插件开发.md'), 'utf8')
assert.match(docs, /v0\.5/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  version?: string
  scripts?: Record<string, string>
}
assert.equal(pkg.version, '1.82.0')
assert.ok(pkg.scripts?.['verify:extension-api-v0.5'], 'missing verify:extension-api-v0.5 script')

assert.ok(
  isCapabilityPendingConfirm({
    status: 'pending_confirm',
    pendingId: 'pend_x',
    capability: 'chat.sendText',
    pluginId: 'lanpm.example'
  })
)

const unit = join(root, 'tests/unit/plugin/capabilityConfirm.test.ts')
assert.ok(existsSync(unit), 'missing capabilityConfirm unit test')

console.log('verify:extension-api-v0.5 OK')
