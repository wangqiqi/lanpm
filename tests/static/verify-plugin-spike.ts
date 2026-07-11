/**
 * SPIKE-276–278 — Plugin system load boundary & extension points.
 * Run: npm run verify:plugin-spike
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import {
  PLUGIN_SECURITY_RULES,
  type PluginManifest
} from '../../src/shared/plugin/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const sample: PluginManifest = {
  id: 'lanpm.example',
  name: 'Example',
  version: '0.0.0',
  slots: ['task.detail.section'],
  capabilities: ['task.get'],
  pricing: 'free'
}
assert.equal(sample.pricing, 'free')
assert.ok(PLUGIN_SECURITY_RULES.includes('no-plugin-ipcMain'))
assert.ok(existsSync(join(root, 'src/shared/plugin/types.ts')))

const mainIndex = readFileSync(join(root, 'src/main/index.ts'), 'utf8')
assert.match(mainIndex, /contextIsolation:\s*true/)
assert.match(mainIndex, /nodeIntegration:\s*false/)
assert.match(mainIndex, /registerAllIpcHandlers/)

const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preload, /contextBridge\.exposeInMainWorld\('lanpm'/)

const webviewGuard = readFileSync(join(root, 'src/main/webviewGuard.ts'), 'utf8')
assert.match(webviewGuard, /sandbox\s*=\s*true/)
assert.match(webviewGuard, /delete[\s\S]*preload/)

const csp = readFileSync(join(root, 'src/renderer/index.html'), 'utf8')
assert.match(csp, /Content-Security-Policy/)

const feige = readFileSync(join(root, 'docs/飞鸽飞秋.md'), 'utf8')
assert.match(feige, /verify:plugin-spike/)
assert.match(feige, /插件加载边界/)

const docs06 = readFileSync(join(root, 'docs/06_验收与里程碑计划.md'), 'utf8')
assert.match(docs06, /verify:plugin-spike/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:plugin-spike'], 'missing verify:plugin-spike')

const types = readFileSync(join(root, 'src/shared/plugin/types.ts'), 'utf8')
assert.match(types, /export type PluginManifest/)
assert.match(types, /task\.detail\.section/)
assert.match(types, /no-plugin-ipcMain/)

console.log('verify:plugin-spike OK (security baseline · PluginManifest · docs)')
