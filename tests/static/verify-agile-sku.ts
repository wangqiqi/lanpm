/**
 * TASK-5601 — Paid agile SKU shell (lanpm.agile).
 * Run: npm run verify:agile-sku
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const manifest = JSON.parse(readFileSync(join(root, 'plugins/lanpm.agile/plugin.json'), 'utf8'))
const parsed = parsePluginManifest(manifest)
assert.equal(parsed?.id, 'lanpm.agile')
assert.equal(parsed?.pricing, 'paid')
assert.ok(parsed?.slots.includes('board.toolbar'))
assert.ok(parsed?.slots.includes('board.card.footer'))
assert.ok(parsed?.capabilities.includes('task.list'))
assert.ok(parsed?.capabilities.includes('task.patch'))

const stub = readFileSync(join(root, 'src/renderer/src/plugin/builtins/AgileStub.tsx'), 'utf8')
assert.match(stub, /data-testid="agile-board-toolbar"/)
assert.match(stub, /isPluginLicenseActive/)
assert.match(stub, /agile-license-cta/)
assert.match(stub, /openProfileTab/)
assert.match(stub, /agile-story-points/)
assert.match(stub, /sumStoryPointsByStatus/)
assert.match(stub, /invokeCapability/)
assert.match(stub, /agile-burndown/)
assert.match(stub, /getAgileBurndown/)
assert.match(stub, /burndownPolyline/)
assert.match(stub, /agile-wip/)
assert.match(stub, /setAgileWipLimit/)
assert.match(stub, /getAgileWipLimits/)
assert.match(stub, /overWipColumns/)
assert.match(stub, /agile-iteration/)
assert.match(stub, /getAgileIterations/)
assert.match(stub, /createAgileIteration/)
assert.match(stub, /agile-iteration-card/)
assert.match(stub, /agile-velocity/)
assert.match(stub, /getAgileVelocity/)

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
assert.match(proxy, /assertPaidPluginLicensed/)

const registry = readFileSync(join(root, 'src/renderer/src/plugin/registry.ts'), 'utf8')
assert.match(registry, /lanpm\.agile.*AgileStub/)

const board = readFileSync(join(root, 'src/renderer/src/features/board/BoardView.tsx'), 'utf8')
assert.match(board, /PluginZoneHost/)
assert.match(board, /view: 'board'/)
assert.match(board, /subscribeAgileWip/)
assert.match(board, /data-wip-over/)
assert.match(board, /invalid=\{false\}/)
assert.match(board, /subscribeAgileIteration/)
assert.match(board, /data-iteration-filter/)
assert.match(board, /tasksInCurrentIteration/)

const docs07 = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')
assert.match(docs07, /lanpm\.agile/)

const docs06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(docs06, /lanpm\.agile/)
assert.match(docs06, /SPRINT-56/)
assert.match(docs06, /SPRINT-66/)
assert.match(docs06, /SPRINT-69/)
assert.match(docs06, /SPRINT-70/)
assert.match(docs06, /SPRINT-71/)
assert.doesNotMatch(docs06, /迭代容器仍后置/)
assert.doesNotMatch(docs06, /速度图仍后置/)
assert.doesNotMatch(docs06, /速度图 \/ carry-over 仍后置/)
assert.match(docs06, /速度图已交付/)
assert.match(docs06, /carry-over 仍后置/)
assert.match(docs06, /迭代容器/)
assert.match(docs06, /仍永不插件化拆卖/)

const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')
assert.match(schemaSql, /story_points/)
assert.match(schemaSql, /agile_burndown_samples/)
assert.match(schemaSql, /agile_wip_limits/)
assert.match(schemaSql, /agile_iterations/)
assert.match(schemaSql, /agile_iteration_current/)
assert.match(schemaSql, /agile_iteration_samples/)
assert.match(schemaSql, /iteration_id/)

const service = readFileSync(join(root, 'src/main/task/agileBurndownService.ts'), 'utf8')
assert.match(service, /assertPaidPluginLicensed\('lanpm\.agile'/)
assert.match(service, /getAgileBurndown/)
assert.match(service, /upsertAgileBurndownSample/)

const wipService = readFileSync(join(root, 'src/main/task/agileWipService.ts'), 'utf8')
assert.match(wipService, /assertPaidPluginLicensed\('lanpm\.agile'/)
assert.match(wipService, /getAgileWipLimits/)
assert.match(wipService, /setAgileWipLimit/)

const iterService = readFileSync(join(root, 'src/main/task/agileIterationService.ts'), 'utf8')
assert.match(iterService, /assertPaidPluginLicensed\('lanpm\.agile'/)
assert.match(iterService, /createAgileIteration/)
assert.match(iterService, /setCurrentAgileIteration/)

const velService = readFileSync(join(root, 'src/main/task/agileVelocityService.ts'), 'utf8')
assert.match(velService, /assertPaidPluginLicensed\('lanpm\.agile'/)
assert.match(velService, /getAgileVelocity/)
assert.match(velService, /buildAgileVelocityView/)

const editModal = readFileSync(
  join(root, 'src/renderer/src/features/board/TaskEditModal.tsx'),
  'utf8'
)
assert.ok(!editModal.includes('storyPoints'), 'core TaskEditModal must not expose storyPoints')
assert.ok(!editModal.includes('iterationId'), 'core TaskEditModal must not expose iterationId')

const whitelist = readFileSync(join(root, 'src/shared/plugin/taskPatchWhitelist.ts'), 'utf8')
assert.match(whitelist, /storyPoints/)
assert.match(whitelist, /iterationId/)

const enabled = readFileSync(join(root, 'src/shared/plugin/enabledDefaults.ts'), 'utf8')
assert.ok(!enabled.includes("'lanpm.agile'"), 'paid agile must not default-enable')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:agile-sku'], 'missing verify:agile-sku script')
assert.match(pkg.scripts['verify:agile-sku'] ?? '', /verify-agile-burndown/)
assert.match(pkg.scripts['verify:agile-sku'] ?? '', /verify-agile-wip/)
assert.match(pkg.scripts['verify:agile-sku'] ?? '', /verify-agile-iteration/)

console.log('verify:agile-sku OK')
