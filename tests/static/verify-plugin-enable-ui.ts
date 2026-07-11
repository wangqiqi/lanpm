/**
 * TASK-299 — Profile plugin enable UI.
 * Run: npm run verify:plugin-enable-ui
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(existsSync(join(root, 'src/renderer/src/features/profile/PluginsPanel.tsx')))
assert.ok(existsSync(join(root, 'src/renderer/src/plugin/pluginEvents.ts')))

const profile = readFileSync(
  join(root, 'src/renderer/src/features/profile/ProfileModal.tsx'),
  'utf8'
)
assert.match(profile, /PluginsPanel/)
assert.match(profile, /profile\.tabPlugins/)
assert.match(profile, /common\.close/)
assert.match(profile, /isProfileTab/)

const panel = readFileSync(
  join(root, 'src/renderer/src/features/profile/PluginsPanel.tsx'),
  'utf8'
)
assert.match(panel, /setEnabled/)
assert.match(panel, /listPlugins/)
assert.match(panel, /PLUGIN_ENABLED_CHANGED_EVENT/)

const slot = readFileSync(join(root, 'src/renderer/src/plugin/PluginSlot.tsx'), 'utf8')
assert.match(slot, /PLUGIN_ENABLED_CHANGED_EVENT/)
assert.match(slot, /reloadToken/)

const stub = readFileSync(
  join(root, 'src/renderer/src/platform/browserLanpmStub.ts'),
  'utf8'
)
assert.match(stub, /mutateStubPluginEnabled/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:plugin-enable-ui'])

console.log('verify:plugin-enable-ui OK')
