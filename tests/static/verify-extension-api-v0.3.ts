/**
 * TASK-1006 — Extension API v0.3 guards.
 * Run: npm run verify:extension-api-v0.3
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'
import { PLUGIN_CAPABILITY_IDS } from '../../src/shared/plugin/types.ts'
import {
  getDisallowedTaskPatchFields,
  TASK_PATCH_WHITELIST_FIELDS
} from '../../src/shared/plugin/taskPatchWhitelist.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const v03Caps = ['task.patch', 'board.moveTask'] as const

for (const cap of v03Caps) {
  assert.ok(PLUGIN_CAPABILITY_IDS.includes(cap), `PLUGIN_CAPABILITY_IDS missing ${cap}`)
}

assert.ok(
  existsSync(join(root, 'src/shared/plugin/taskPatchWhitelist.ts')),
  'missing taskPatchWhitelist.ts'
)

const capabilityTypes = readFileSync(
  join(root, 'src/shared/plugin/capabilityTypes.ts'),
  'utf8'
)
for (const cap of v03Caps) {
  assert.match(capabilityTypes, new RegExp(`'${cap.replace('.', '\\.')}'`))
}
assert.match(capabilityTypes, /TaskPatchArgs/)
assert.match(capabilityTypes, /BoardMoveTaskArgs/)

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
for (const cap of v03Caps) {
  assert.match(proxy, new RegExp(`case '${cap.replace('.', '\\.')}':`))
}
assert.match(proxy, /getDisallowedTaskPatchFields/)
assert.match(proxy, /updateGroupTask/)
assert.match(proxy, /moveGroupTask/)

const exampleManifest = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.example/plugin.json'), 'utf8')
)
const parsed = parsePluginManifest(exampleManifest)
assert.equal(parsed?.id, 'lanpm.example')
for (const cap of v03Caps) {
  assert.ok(parsed?.capabilities.includes(cap), `lanpm.example missing ${cap}`)
}

const exampleStub = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/ExampleStub.tsx'),
  'utf8'
)
assert.match(exampleStub, /task\.patch/)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
for (const cap of v03Caps) {
  assert.match(stub, new RegExp(`capability === '${cap.replace('.', '\\.')}'`))
}

assert.deepEqual(TASK_PATCH_WHITELIST_FIELDS, [
  'title',
  'status',
  'progressPercent',
  'priority',
  'tags',
  'storyPoints',
  'iterationId'
])
assert.deepEqual(getDisallowedTaskPatchFields({ title: 'x', assigneeUserId: 'u1' }), [
  'assigneeUserId'
])

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:extension-api-v0.3'], 'missing verify:extension-api-v0.3 script')

assert.ok(
  existsSync(join(root, 'tests/unit/plugin/taskPatchWhitelist.test.ts')),
  'missing taskPatchWhitelist unit test'
)

console.log('verify:extension-api-v0.3 OK')
