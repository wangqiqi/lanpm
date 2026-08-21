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

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
assert.match(proxy, /assertPaidPluginLicensed/)

const registry = readFileSync(join(root, 'src/renderer/src/plugin/registry.ts'), 'utf8')
assert.match(registry, /lanpm\.agile.*AgileStub/)

const board = readFileSync(join(root, 'src/renderer/src/features/board/BoardView.tsx'), 'utf8')
assert.match(board, /PluginZoneHost/)
assert.match(board, /view: 'board'/)

const docs07 = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')
assert.match(docs07, /lanpm\.agile/)

const docs06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(docs06, /lanpm\.agile/)
assert.match(docs06, /SPRINT-56/)
assert.match(docs06, /SPRINT-66/)
assert.match(docs06, /WIP \/ 迭代容器仍后置/)
assert.match(docs06, /仍永不插件化拆卖/)

const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')
assert.match(schemaSql, /story_points/)
assert.match(schemaSql, /agile_burndown_samples/)

const service = readFileSync(join(root, 'src/main/task/agileBurndownService.ts'), 'utf8')
assert.match(service, /assertPaidPluginLicensed\('lanpm\.agile'/)
assert.match(service, /getAgileBurndown/)
assert.match(service, /upsertAgileBurndownSample/)

const editModal = readFileSync(
  join(root, 'src/renderer/src/features/board/TaskEditModal.tsx'),
  'utf8'
)
assert.ok(!editModal.includes('storyPoints'), 'core TaskEditModal must not expose storyPoints')

const whitelist = readFileSync(join(root, 'src/shared/plugin/taskPatchWhitelist.ts'), 'utf8')
assert.match(whitelist, /storyPoints/)

const enabled = readFileSync(join(root, 'src/shared/plugin/enabledDefaults.ts'), 'utf8')
assert.ok(!enabled.includes("'lanpm.agile'"), 'paid agile must not default-enable')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:agile-sku'], 'missing verify:agile-sku script')
assert.match(pkg.scripts['verify:agile-sku'] ?? '', /verify-agile-burndown/)

console.log('verify:agile-sku OK')
