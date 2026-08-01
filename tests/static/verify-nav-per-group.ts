/**
 * TASK-1017 — Per-group nav preferences guards.
 * Run: npm run verify:nav-per-group
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const shared = readFileSync(join(root, 'src/shared/navigation/navPreferences.ts'), 'utf8')
assert.match(shared, /NavPreferencesDocument/)
assert.match(shared, /resolveNavPreferencesForGroup/)
assert.match(shared, /normalizeNavPreferencesDocument/)
assert.match(shared, /hasGroupNavOverride/)

const store = readFileSync(join(root, 'src/main/navigation/navPreferencesStore.ts'), 'utf8')
assert.match(store, /readNavPreferencesDocument/)
assert.match(store, /writeGroupNavPreferences/)
assert.match(store, /clearGroupNavOverride/)
assert.match(store, /nav-preferences\.json/)

const channels = readFileSync(join(root, 'src/shared/navigation/channels.ts'), 'utf8')
assert.match(channels, /getGroupPreferences/)
assert.match(channels, /setGroupPreferences/)
assert.match(channels, /clearGroupOverride/)

const ipc = readFileSync(join(root, 'src/main/ipc/nav.ts'), 'utf8')
assert.match(ipc, /NAV_IPC\.getDocument/)
assert.match(ipc, /getGroupPreferences/)

const rendererStore = readFileSync(
  join(root, 'src/renderer/src/stores/navPreferencesStore.ts'),
  'utf8'
)
assert.match(rendererStore, /resolveNavPreferencesForGroup/)
assert.match(rendererStore, /setActiveGroupId/)
assert.match(rendererStore, /selectEditingPreferences/)

const bottomNav = readFileSync(join(root, 'src/renderer/src/layout/BottomNav.tsx'), 'utf8')
assert.match(bottomNav, /useNavPreferencesStore/)
assert.match(bottomNav, /resolveVisibleViews/)

const guard = readFileSync(join(root, 'src/renderer/src/routes/GroupViewGuard.tsx'), 'utf8')
assert.match(guard, /useNavPreferencesStore/)
assert.match(guard, /isViewAllowedForGroup/)

const pluginGuard = readFileSync(join(root, 'src/renderer/src/routes/PluginViewGuard.tsx'), 'utf8')
assert.match(pluginGuard, /useNavPreferencesStore/)
assert.match(pluginGuard, /contribution\.groupTypes\.includes/)

const panel = readFileSync(
  join(root, 'src/renderer/src/features/profile/NavPreferencesPanel.tsx'),
  'utf8'
)
assert.match(panel, /navScopeGlobal/)
assert.match(panel, /navFollowGlobal/)
assert.match(panel, /selectEditingPreferences/)

const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preload, /nav:getDocument/)
assert.match(preload, /nav:setGroupPreferences/)
assert.match(preload, /nav:clearGroupOverride/)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
assert.match(stub, /getDocument/)
assert.match(stub, /setGroupPreferences/)
assert.match(stub, /clearGroupOverride/)

const app = readFileSync(join(root, 'src/renderer/src/App.tsx'), 'utf8')
assert.match(app, /setActiveGroupId/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:nav-per-group'], 'missing verify:nav-per-group script')

assert.ok(existsSync(join(root, 'tests/unit/navigation/navPreferences.test.ts')))

console.log('verify:nav-per-group OK')
