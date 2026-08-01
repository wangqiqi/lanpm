/**
 * TASK-919 — Layer C contributions.views sprint guards.
 * Run: npm run verify:contributions-views
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'
import { isReservedContributionRoute } from '../../src/shared/plugin/contributions.ts'
import { PLUGIN_SLOT_IDS } from '../../src/shared/plugin/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  scripts?: Record<string, string>
  version?: string
}
assert.ok(!pkg.dependencies?.['mind-elixir'], 'mind-elixir must not be in core dependencies')
assert.ok(pkg.scripts?.['verify:contributions-views'], 'missing verify:contributions-views script')

const pluginPkgPath = join(root, 'plugins/lanpm.mindmap/package.json')
assert.ok(existsSync(pluginPkgPath), 'missing plugins/lanpm.mindmap/package.json')
const pluginPkg = JSON.parse(readFileSync(pluginPkgPath, 'utf8')) as {
  dependencies?: Record<string, string>
}
assert.ok(pluginPkg.dependencies?.['mind-elixir'], 'plugin package.json must declare mind-elixir')

assert.ok(existsSync(join(root, 'plugins/lanpm.mindmap/README.md')))
assert.ok(existsSync(join(root, 'plugins/lanpm.mindmap/ORIGIN.md')))

const manifest = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.mindmap/plugin.json'), 'utf8')
)
const parsed = parsePluginManifest(manifest)
assert.equal(parsed?.id, 'lanpm.mindmap')
assert.equal(parsed?.contributions?.views?.[0]?.route, 'mindmap')
assert.ok(isReservedContributionRoute('chat'))
assert.ok(!isReservedContributionRoute('mindmap'))
assert.ok(PLUGIN_SLOT_IDS.includes('mindmap.toolbar'))

const router = readFileSync(join(root, 'src/renderer/src/app/AppRouter.tsx'), 'utf8')
assert.match(router, /:contributedRoute/)
assert.match(router, /PluginViewGuard/)
assert.match(router, /PluginContributedView/)

const bottomNav = readFileSync(join(root, 'src/renderer/src/layout/BottomNav.tsx'), 'utf8')
assert.match(bottomNav, /useContributedViews/)
assert.match(bottomNav, /contributedViewPath/)

const viewRegistry = readFileSync(join(root, 'src/renderer/src/plugin/viewRegistry.ts'), 'utf8')
assert.match(viewRegistry, /lanpm\.mindmap.*MindmapView/)

const loader = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/mindElixirLoader.ts'),
  'utf8'
)
assert.match(loader, /import\('mind-elixir'\)/)
assert.doesNotMatch(loader, /new Function/, 'loader must use Vite-resolvable import, not Function constructor')

const view = readFileSync(
  join(root, 'src/renderer/src/plugin/builtins/MindmapView.tsx'),
  'utf8'
)
assert.match(view, /loadMindElixirClient/)
assert.match(view, /MindmapStub/)

const slotMap = readFileSync(join(root, 'src/renderer/src/plugin/viewSlotMap.ts'), 'utf8')
assert.match(slotMap, /CONTRIBUTED_VIEW_SLOT_MAP/)
assert.match(slotMap, /mindmap\.toolbar/)

const channels = readFileSync(join(root, 'src/shared/plugin/channels.ts'), 'utf8')
assert.match(channels, /listContributedViews/)

const enabled = readFileSync(join(root, 'src/shared/plugin/enabledDefaults.ts'), 'utf8')
assert.match(enabled, /lanpm\.mindmap/)

console.log('verify:contributions-views OK')
