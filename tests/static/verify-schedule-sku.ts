/**
 * TASK-5401 — Paid schedule SKU shell (lanpm.schedule).
 * Run: npm run verify:schedule-sku
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const manifest = JSON.parse(readFileSync(join(root, 'plugins/lanpm.schedule/plugin.json'), 'utf8'))
const parsed = parsePluginManifest(manifest)
assert.equal(parsed?.id, 'lanpm.schedule')
assert.equal(parsed?.pricing, 'paid')
assert.ok(parsed?.slots.includes('gantt.toolbar'))
assert.ok(parsed?.capabilities.includes('task.list'))

assert.ok(existsSync(join(root, 'src/renderer/src/plugin/builtins/ScheduleStub.tsx')))

const registry = readFileSync(join(root, 'src/renderer/src/plugin/registry.ts'), 'utf8')
assert.match(registry, /lanpm\.schedule.*ScheduleStub/)

const gantt = readFileSync(join(root, 'src/renderer/src/features/gantt/GanttView.tsx'), 'utf8')
assert.match(gantt, /PluginZoneHost/)
assert.match(gantt, /view: 'gantt'/)

const docs07 = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')
assert.match(docs07, /lanpm\.schedule/)

const enabled = readFileSync(join(root, 'src/shared/plugin/enabledDefaults.ts'), 'utf8')
assert.ok(!enabled.includes("'lanpm.schedule'"), 'paid schedule must not default-enable')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:schedule-sku'], 'missing verify:schedule-sku script')

console.log('verify:schedule-sku OK')
