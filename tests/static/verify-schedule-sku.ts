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
assert.match(stub, /schedule-freeze-baseline/)
assert.match(stub, /freezeScheduleBaseline/)
assert.match(stub, /getScheduleBaseline/)
assert.match(stub, /schedule-assignee-overlap/)
assert.match(stub, /findAssigneeOverlapTaskIds/)
assert.match(stub, /countAssigneeOverlapTasks/)

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
assert.match(gantt, /subscribeScheduleBaseline/)
assert.match(gantt, /subscribeScheduleOverlap/)
assert.match(gantt, /barStylesForAssigneeOverlap/)
assert.match(gantt, /data-schedule-baseline/)
assert.match(gantt, /data-schedule-overlap/)

const service = readFileSync(join(root, 'src/main/task/scheduleBaselineService.ts'), 'utf8')
assert.match(service, /assertPaidPluginLicensed\('lanpm\.schedule'/)
assert.match(service, /freezeScheduleBaseline/)
assert.match(service, /replaceGroupScheduleBaseline/)
assert.match(service, /listTasksByGroup/)

const schemaTs = readFileSync(join(root, 'src/main/storage/schema.ts'), 'utf8')
assert.match(schemaTs, /schedule_baselines/)
assert.ok(Number(schemaTs.match(/SCHEMA_VERSION\s*=\s*(\d+)/)?.[1] ?? 0) >= 20)

const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')
assert.match(schemaSql, /CREATE TABLE schedule_baselines/)

const migrate = readFileSync(join(root, 'src/main/storage/migrate.ts'), 'utf8')
assert.match(migrate, /fromVersion: 19/)
assert.match(migrate, /schedule_baselines/)

const cp = readFileSync(join(root, 'src/shared/task/criticalPath.ts'), 'utf8')
assert.match(cp, /computeCriticalPath/)
assert.match(cp, /emptyReason: 'cycle'/)
assert.match(cp, /DEP_TYPES/)
assert.doesNotMatch(cp, /dep\.type !== ['"]FS['"]/)

const overlap = readFileSync(join(root, 'src/shared/task/assigneeOverlap.ts'), 'utf8')
assert.match(overlap, /findAssigneeOverlapTaskIds/)
assert.match(overlap, /hasExplicitYmdSchedule/)
assert.match(overlap, /SCHEDULE_OVERLAP_COLOR = '#7c3aed'/)
assert.doesNotMatch(overlap, /defaultScheduleForTask/)
assert.doesNotMatch(overlap, /SCHEDULE_OVERLAP_COLOR = '#c2410c'/)

const overlapBridge = readFileSync(
  join(root, 'src/renderer/src/plugin/scheduleOverlapBridge.ts'),
  'utf8'
)
assert.match(overlapBridge, /publishScheduleOverlap/)
assert.match(overlapBridge, /subscribeScheduleOverlap/)

const docs07 = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')
assert.match(docs07, /lanpm\.schedule/)

const docs06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(docs06, /lanpm\.schedule/)
assert.match(docs06, /SPRINT-54/)
assert.match(docs06, /SPRINT-65/)
assert.match(docs06, /资源平衡仍后置/)
assert.doesNotMatch(docs06, /基线仍后置/)
assert.match(docs06, /仍永不插件化拆卖/)

const enabled = readFileSync(join(root, 'src/shared/plugin/enabledDefaults.ts'), 'utf8')
assert.ok(!enabled.includes("'lanpm.schedule'"), 'paid schedule must not default-enable')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:schedule-sku'], 'missing verify:schedule-sku script')
assert.match(
  pkg.scripts['verify:schedule-sku'] ?? '',
  /verify-schedule-baseline/,
  'schedule-sku must run baseline sqlite round-trip'
)

console.log('verify:schedule-sku OK')
