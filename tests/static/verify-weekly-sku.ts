/**
 * TASK-5701 — Paid weekly-report SKU shell (lanpm.weekly).
 * Run: npm run verify:weekly-sku
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const manifest = JSON.parse(readFileSync(join(root, 'plugins/lanpm.weekly/plugin.json'), 'utf8'))
const parsed = parsePluginManifest(manifest)
assert.equal(parsed?.id, 'lanpm.weekly')
assert.equal(parsed?.pricing, 'paid')
assert.ok(parsed?.slots.includes('topbar.menu'))
assert.ok(parsed?.capabilities.includes('license.feature'))

const stub = readFileSync(join(root, 'src/renderer/src/plugin/builtins/WeeklyStub.tsx'), 'utf8')
assert.match(stub, /lanpm\.weekly/)

const cockpit = readFileSync(join(root, 'src/main/cockpit/cockpitService.ts'), 'utf8')
assert.match(cockpit, /assertPaidPluginLicensed\('lanpm\.weekly'/)
assert.ok(
  cockpit.includes('export async function evaluateProjects') &&
    !cockpit
      .slice(cockpit.indexOf('export async function evaluateProjects'))
      .includes("assertPaidPluginLicensed('lanpm.weekly'"),
  'evaluateProjects must stay ungated'
)

const view = readFileSync(join(root, 'src/renderer/src/views/CockpitView.tsx'), 'utf8')
assert.match(view, /weekly-license-cta/)
assert.match(view, /openProfileTab/)
assert.match(view, /lanpm\.weekly/)
assert.match(view, /runReport\('evaluate'\)/)

const registry = readFileSync(join(root, 'src/renderer/src/plugin/registry.ts'), 'utf8')
assert.match(registry, /lanpm\.weekly.*WeeklyStub/)

const docs07 = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')
assert.match(docs07, /lanpm\.weekly/)

const docs06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(docs06, /lanpm\.weekly/)
assert.match(docs06, /SPRINT-57/)
assert.match(docs06, /SPRINT-64/)
assert.match(docs06, /仍永不插件化拆卖/)

const enabled = readFileSync(join(root, 'src/shared/plugin/enabledDefaults.ts'), 'utf8')
assert.ok(!enabled.includes("'lanpm.weekly'"), 'paid weekly must not default-enable')

const reportMd = readFileSync(join(root, 'src/shared/cockpit/reportMarkdown.ts'), 'utf8')
assert.match(reportMd, /## 下周计划/)
assert.match(reportMd, /## 本月里程碑/)
assert.match(reportMd, /## 风险汇总/)

assert.doesNotMatch(
  cockpit,
  /\.replace\(['"]# LanPM 周报['"]/,
  'monthly must not be a weekly title-swap'
)
assert.match(cockpit, /buildWeeklyReportMarkdown/)
assert.match(cockpit, /buildMonthlyReportMarkdown/)
assert.match(cockpit, /selectOpenTasksDueNextWeek/)
assert.match(cockpit, /selectMilestonesThisMonth/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:weekly-sku'], 'missing verify:weekly-sku script')

console.log('verify:weekly-sku OK')
