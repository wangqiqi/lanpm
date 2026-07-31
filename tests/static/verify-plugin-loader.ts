/**
 * TASK-294 — Plugin loader + form-js POC.
 * Run: npm run verify:plugin-loader
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'
import { PLUGIN_SECURITY_RULES } from '../../src/shared/plugin/types.ts'
import { PLUGIN_IPC } from '../../src/shared/plugin/channels.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(PLUGIN_SECURITY_RULES.includes('no-plugin-ipcMain'))
assert.equal(PLUGIN_IPC.listPlugins, 'plugin:listPlugins')

const example = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.example/plugin.json'), 'utf8')
)
const formjs = JSON.parse(readFileSync(join(root, 'plugins/lanpm.formjs/plugin.json'), 'utf8'))
assert.equal(parsePluginManifest(example)?.id, 'lanpm.example')
assert.equal(parsePluginManifest(formjs)?.pricing, 'paid')

assert.ok(existsSync(join(root, 'src/main/plugin/discover.ts')))
assert.ok(existsSync(join(root, 'src/main/plugin/capabilityProxy.ts')))
assert.ok(existsSync(join(root, 'src/main/ipc/plugin.ts')))
assert.ok(existsSync(join(root, 'src/renderer/src/plugin/PluginSlot.tsx')))
assert.ok(existsSync(join(root, 'src/renderer/src/plugin/builtins/FormJsView.tsx')))
assert.ok(existsSync(join(root, 'src/renderer/src/plugin/builtins/FormJsPoc.tsx')))

const mainIndex = readFileSync(join(root, 'src/main/index.ts'), 'utf8')
assert.match(mainIndex, /registerPluginIpc/)
assert.match(mainIndex, /contextIsolation:\s*true/)
assert.match(mainIndex, /nodeIntegration:\s*false/)

const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preload, /plugin:\s*\{/)
assert.match(preload, /plugin:listPlugins/)
assert.match(preload, /plugin:invokeCapability/)

const detail = readFileSync(
  join(root, 'src/renderer/src/features/tree/TaskDetailPanel.tsx'),
  'utf8'
)
assert.match(detail, /PluginSlot/)
assert.match(detail, /task\.detail\.section/)

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
assert.match(proxy, /capability not granted/)
assert.match(proxy, /pluginDeclaresCapability/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  scripts?: Record<string, string>
}
assert.ok(!pkg.dependencies?.['@bpmn-io/form-js'], 'form-js must not be in core dependencies')
assert.ok(pkg.scripts?.['verify:plugin-loader'], 'missing verify:plugin-loader')

const builder = readFileSync(join(root, 'electron-builder.yml'), 'utf8')
assert.match(builder, /plugins/)

const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(roadmap, /verify:plugin-loader/)

console.log('verify:plugin-loader OK')
