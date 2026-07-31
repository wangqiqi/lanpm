/**
 * TASK-1062 — Extension API v0.4 human-review guards.
 * Run: npm run verify:extension-api-v0.4
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
  getDisallowedTaskCreateFields,
  parseTaskCreateInput,
  TASK_CREATE_WHITELIST_FIELDS
} from '../../src/shared/plugin/taskCreateWhitelist.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(PLUGIN_CAPABILITY_IDS.includes('task.create'), 'PLUGIN_CAPABILITY_IDS missing task.create')

for (const cap of HUMAN_REVIEW_CAPABILITY_IDS) {
  assert.ok(isHumanReviewCapability(cap), `expected human review: ${cap}`)
}
assert.equal(isHumanReviewCapability('chat.sendTaskRef'), false)

assert.deepEqual(TASK_CREATE_WHITELIST_FIELDS, [
  'groupId',
  'title',
  'status',
  'priority',
  'tags'
])
assert.deepEqual(getDisallowedTaskCreateFields({ groupId: 'g', title: 't', assigneeUserId: 'u' }), [
  'assigneeUserId'
])
assert.equal(parseTaskCreateInput({ groupId: 'g1', title: 'Hello' }).ok, true)
assert.equal(parseTaskCreateInput({ groupId: 'g1', title: 'Hello', parentTaskId: 'x' }).ok, false)

assert.ok(
  existsSync(join(root, 'src/shared/plugin/capabilityConfirm.ts')),
  'missing capabilityConfirm.ts'
)
assert.ok(
  existsSync(join(root, 'src/shared/plugin/taskCreateWhitelist.ts')),
  'missing taskCreateWhitelist.ts'
)
assert.ok(
  existsSync(join(root, 'src/main/plugin/capabilityPendingStore.ts')),
  'missing capabilityPendingStore.ts'
)
assert.ok(
  existsSync(join(root, 'docs/specs/002-extension-api-v0.4/spec.md')),
  'missing v0.4 spec'
)

const channels = readFileSync(join(root, 'src/shared/plugin/channels.ts'), 'utf8')
assert.match(channels, /confirmCapability/)

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
assert.match(proxy, /pending_confirm/)
assert.match(proxy, /confirmPluginCapability/)
assert.match(proxy, /case 'task\.create':/)
assert.match(proxy, /isHumanReviewCapability/)

const ipc = readFileSync(join(root, 'src/main/ipc/plugin.ts'), 'utf8')
assert.match(ipc, /confirmCapability/)
assert.match(ipc, /confirmPluginCapability/)

const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preload, /confirmCapability/)

const api = readFileSync(join(root, 'src/shared/lanpm-api.ts'), 'utf8')
assert.match(api, /confirmCapability/)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
assert.match(stub, /confirmCapability/)
assert.match(stub, /pending_confirm/)
assert.match(stub, /task\.create/)

const helper = readFileSync(
  join(root, 'src/renderer/src/plugin/invokeCapabilityWithHumanConfirm.ts'),
  'utf8'
)
assert.match(helper, /isCapabilityPendingConfirm/)
assert.match(helper, /confirmCapability/)

const exampleStub = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/ExampleStub.tsx'),
  'utf8'
)
assert.match(exampleStub, /invokeCapabilityWithHumanConfirm/)
assert.match(exampleStub, /task\.create/)

const exampleManifest = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.example/plugin.json'), 'utf8')
)
const parsed = parsePluginManifest(exampleManifest)
assert.equal(parsed?.id, 'lanpm.example')
assert.ok(parsed?.capabilities.includes('task.create'), 'lanpm.example missing task.create')
assert.equal(exampleManifest.version, '0.4.0')

const docs = readFileSync(join(root, 'docs/插件开发.md'), 'utf8')
assert.match(docs, /v0\.4/)
assert.match(docs, /人审|pending_confirm|confirmCapability/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  version?: string
  scripts?: Record<string, string>
}
assert.equal(pkg.version, '1.80.0')
assert.ok(pkg.scripts?.['verify:extension-api-v0.4'], 'missing verify:extension-api-v0.4 script')

assert.ok(
  isCapabilityPendingConfirm({
    status: 'pending_confirm',
    pendingId: 'pend_x',
    capability: 'task.create',
    pluginId: 'lanpm.example'
  })
)
assert.equal(isCapabilityPendingConfirm({ ok: true }), false)

const unit = join(root, 'tests/unit/plugin/capabilityConfirm.test.ts')
assert.ok(existsSync(unit), 'missing capabilityConfirm unit test')

console.log('verify:extension-api-v0.4 OK')
