/**
 * TASK-867 — Nav preferences MVP guards.
 * Run: npm run verify:nav-preferences
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const shared = readFileSync(join(root, 'src/shared/navigation/navPreferences.ts'), 'utf8')
assert.match(shared, /NavPreferences/)
assert.match(shared, /resolveVisibleViews/)
assert.match(shared, /sanitizeNavPreferences/)
assert.match(shared, /resolveVisibleContributedRoutes/)
assert.match(shared, /hiddenContributedRoutes/)
assert.match(shared, /contributedOrder/)
assert.match(
  shared,
  /hiddenViews:\s*\[\.\.\.DEFAULT_HIDDEN_VIEWS\]/,
  'DEFAULT_NAV_PREFERENCES must hide files/whiteboard/gantt/calendar (SPRINT-45)'
)
assert.match(shared, /upgradeV196HiddenViews/)
assert.match(shared, /rawNavDocumentNeedsV196Writeback/)
assert.match(
  shared,
  /hiddenContributedRoutes:\s*\['mindmap'\]/,
  'DEFAULT_NAV_PREFERENCES must hide mindmap contributed tab (IA-404)'
)

const store = readFileSync(join(root, 'src/main/navigation/navPreferencesStore.ts'), 'utf8')
assert.match(store, /nav-preferences\.json/)
assert.match(store, /rawNavDocumentNeedsV196Writeback/)

const ipc = readFileSync(join(root, 'src/main/ipc/nav.ts'), 'utf8')
assert.match(ipc, /NAV_IPC/)

const bottomNav = readFileSync(join(root, 'src/renderer/src/layout/BottomNav.tsx'), 'utf8')
assert.match(bottomNav, /resolveVisibleViews/)
assert.match(bottomNav, /resolveVisibleContributedRoutes/)
assert.match(bottomNav, /useNavPreferencesStore/)
assert.match(
  bottomNav,
  /if \(plugins\.length === 0\) return null/,
  'GroupTabOverflowSlot must not render empty tabSlot when overflow has no plugins (IA-409)'
)

const guard = readFileSync(join(root, 'src/renderer/src/routes/GroupViewGuard.tsx'), 'utf8')
assert.match(guard, /isViewAllowedForGroup/)
assert.match(
  guard,
  /hiddenViews 仅影响底栏/,
  'GroupViewGuard must not block routes hidden only in BottomNav (SPRINT-15 IA)'
)

const pluginGuard = readFileSync(join(root, 'src/renderer/src/routes/PluginViewGuard.tsx'), 'utf8')
assert.match(pluginGuard, /contribution\.groupTypes\.includes/)
assert.match(
  pluginGuard,
  /hiddenContributedRoutes 仅影响底栏/,
  'PluginViewGuard must not block contributed routes hidden only in BottomNav (SPRINT-15 IA)'
)

const profile = readFileSync(join(root, 'src/renderer/src/features/profile/ProfileModal.tsx'), 'utf8')
assert.match(profile, /NavPreferencesPanel/)
assert.match(profile, /profile\.tabNav/)

const panel = readFileSync(
  join(root, 'src/renderer/src/features/profile/NavPreferencesPanel.tsx'),
  'utf8'
)
assert.match(panel, /useContributedViews/)
assert.match(panel, /hiddenContributedRoutes/)
assert.match(panel, /contributedOrder/)
assert.match(panel, /profile\.navPluginHint/)

const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preload, /nav:getPreferences/)
assert.match(preload, /nav:setPreferences/)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
assert.match(stub, /nav:\s*\{/)
assert.match(stub, /getPreferences/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:nav-preferences'], 'missing verify:nav-preferences script')

assert.ok(existsSync(join(root, 'tests/unit/navigation/navPreferences.test.ts')))
assert.match(
  readFileSync(join(root, 'tests/unit/navigation/navPreferences.test.ts'), 'utf8'),
  /chat', 'board', 'tree/
)

console.log('verify:nav-preferences OK')
