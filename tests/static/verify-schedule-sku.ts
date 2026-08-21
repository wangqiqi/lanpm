/**
 * TASK-5401 — Paid schedule SKU shell (lanpm.schedule).
 * Run: npm run verify:schedule-sku
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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

const stub = readFileSync(join(root, 'src/renderer/src/plugin/builtins/ScheduleStub.tsx'), 'utf8')
assert.match(stub, /isPluginLicenseActive/)
assert.match(stub, /schedule-license-cta/)
assert.match(stub, /openProfileTab/)
assert.match(stub, /schedule-critical-path-switch/)
assert.match(stub, /computeCriticalPath/)
assert.match(stub, /invokeCapability/)

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
assert.match(proxy, /assertPaidPluginLicensed/)

const licenseStore = readFileSync(join(root, 'src/main/plugin/licenseStore.ts'), 'utf8')
assert.match(licenseStore, /assertPaidPluginLicensed/)

const registry = readFileSync(join(root, 'src/renderer/src/plugin/registry.ts'), 'utf8')
assert.match(registry, /lanpm\.schedule.*ScheduleStub/)

const gantt = readFileSync(join(root, 'src/renderer/src/features/gantt/GanttView.tsx'), 'utf8')
assert.match(gantt, /PluginZoneHost/)
assert.match(gantt, /view: 'gantt'/)
assert.match(gantt, /subscribeScheduleCriticalPath/)

const cp = readFileSync(join(root, 'src/shared/task/criticalPath.ts'), 'utf8')
assert.match(cp, /computeCriticalPath/)
assert.match(cp, /emptyReason: 'cycle'/)
assert.match(cp, /DEP_TYPES/)
assert.doesNotMatch(cp, /dep\.type !== ['"]FS['"]/)

const docs07 = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')
assert.match(docs07, /lanpm\.schedule/)

const docs06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(docs06, /lanpm\.schedule/)
assert.match(docs06, /SPRINT-54/)
assert.match(docs06, /SPRINT-62/)
assert.match(docs06, /仍永不插件化拆卖/)

const enabled = readFileSync(join(root, 'src/shared/plugin/enabledDefaults.ts'), 'utf8')
assert.ok(!enabled.includes("'lanpm.schedule'"), 'paid schedule must not default-enable')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:schedule-sku'], 'missing verify:schedule-sku script')

console.log('verify:schedule-sku OK')
