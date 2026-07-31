/**
 * TASK-897 — Extension API v0.2 guards.
 * Run: npm run verify:extension-api-v0.2
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'
import { PLUGIN_CAPABILITY_IDS } from '../../src/shared/plugin/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const v02Caps = [
  'chat.listMessages',
  'task.getChecklist',
  'member.list',
  'chat.sendTaskRef'
] as const

for (const cap of v02Caps) {
  assert.ok(PLUGIN_CAPABILITY_IDS.includes(cap), `PLUGIN_CAPABILITY_IDS missing ${cap}`)
}

assert.ok(
  existsSync(join(root, 'src/shared/plugin/capabilityTypes.ts')),
  'missing capabilityTypes.ts'
)

const capabilityTypes = readFileSync(
  join(root, 'src/shared/plugin/capabilityTypes.ts'),
  'utf8'
)
for (const cap of v02Caps) {
  assert.match(capabilityTypes, new RegExp(`'${cap.replace('.', '\\.')}'`))
}

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
for (const cap of v02Caps) {
  assert.match(proxy, new RegExp(`case '${cap.replace('.', '\\.')}':`))
}
assert.match(proxy, /sendTaskRefMessage/)
assert.match(proxy, /listTaskChecklist/)
assert.match(proxy, /listGroupMembers/)

const exampleManifest = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.example/plugin.json'), 'utf8')
)
const parsed = parsePluginManifest(exampleManifest)
assert.equal(parsed?.id, 'lanpm.example')
assert.ok(parsed?.slots.includes('chat.composer.action'))
for (const cap of ['chat.sendTaskRef', 'chat.listMessages', 'member.list'] as const) {
  assert.ok(parsed?.capabilities.includes(cap), `lanpm.example missing ${cap}`)
}

const exampleStub = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/ExampleStub.tsx'),
  'utf8'
)
assert.match(exampleStub, /chat\.sendTaskRef/)
assert.match(exampleStub, /chat\.listMessages/)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
for (const cap of v02Caps) {
  assert.match(stub, new RegExp(`capability === '${cap.replace('.', '\\.')}'`))
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:extension-api-v0.2'], 'missing verify:extension-api-v0.2 script')

console.log('verify:extension-api-v0.2 OK')
