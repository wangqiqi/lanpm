/**
 * ops-mvp-p1 — Phase 1 MVP guards.
 * Run: npm run verify:ops-agent
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'
import { PLUGIN_CAPABILITY_IDS } from '../../src/shared/plugin/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
const featureDoc = readFileSync(join(root, 'docs/功能扩展.md'), 'utf8')
const networkTypes = readFileSync(join(root, 'src/shared/network/types.ts'), 'utf8')

assert.ok(pkg.scripts?.['verify:ops-agent'], 'missing verify:ops-agent script')
assert.ok(existsSync(join(root, 'plugins/lanpm.ops/plugin.json')))
assert.ok(existsSync(join(root, 'tools/lanpm-agent/package.json')))
assert.ok(existsSync(join(root, 'src/main/ops/statusSnapshot.ts')))
assert.ok(existsSync(join(root, 'src/main/ops/commandExecutor.ts')))

const statusSnapshot = readFileSync(join(root, 'src/main/ops/statusSnapshot.ts'), 'utf8')
assert.match(statusSnapshot, /readDiskUsageSync/)
assert.match(statusSnapshot, /disk: unavailable/)

const commandExecutor = readFileSync(join(root, 'src/main/ops/commandExecutor.ts'), 'utf8')
assert.match(commandExecutor, /formatStatus\(paths\.root\)/)

assert.ok(existsSync(join(root, 'src/main/ops/opsSyncService.ts')))
assert.ok(existsSync(join(root, 'src/main/gateway/fileStore.ts')))
assert.ok(existsSync(join(root, 'src/shared/chat/opsCommand.ts')))
assert.ok(existsSync(join(root, 'src/cli/agentCli.ts')))

const opsCaps = ['ops.machine.list', 'ops.command.send'] as const
for (const cap of opsCaps) {
  assert.ok(PLUGIN_CAPABILITY_IDS.includes(cap), `missing capability ${cap}`)
}

const manifest = parsePluginManifest(
  JSON.parse(readFileSync(join(root, 'plugins/lanpm.ops/plugin.json'), 'utf8'))
)
assert.equal(manifest?.id, 'lanpm.ops')

const registry = readFileSync(join(root, 'src/renderer/src/plugin/registry.ts'), 'utf8')
assert.match(registry, /lanpm\.ops.*OpsStub/)

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
for (const cap of opsCaps) {
  assert.match(proxy, new RegExp(`case '${cap.replace('.', '\\.')}':`))
}

const chatView = readFileSync(join(root, 'src/renderer/src/features/chat/ChatView.tsx'), 'utf8')
assert.match(chatView, /parseOpsCommand/)

assert.match(networkTypes, /ops_command/)
assert.match(networkTypes, /ops_inbound/)
assert.match(roadmap, /verify:ops-agent/)
assert.match(featureDoc, /SPIKE.*已交付|ops-mvp|Phase 1/i)

console.log('verify:ops-agent OK')
