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

const store = readFileSync(join(root, 'src/main/navigation/navPreferencesStore.ts'), 'utf8')
assert.match(store, /nav-preferences\.json/)

const ipc = readFileSync(join(root, 'src/main/ipc/nav.ts'), 'utf8')
assert.match(ipc, /NAV_IPC/)

const bottomNav = readFileSync(join(root, 'src/renderer/src/layout/BottomNav.tsx'), 'utf8')
assert.match(bottomNav, /resolveVisibleViews/)
assert.match(bottomNav, /useNavPreferencesStore/)

const guard = readFileSync(join(root, 'src/renderer/src/routes/GroupViewGuard.tsx'), 'utf8')
assert.match(guard, /isViewVisibleForGroup/)
assert.match(guard, /viewHiddenByPreference/)

const profile = readFileSync(join(root, 'src/renderer/src/features/profile/ProfileModal.tsx'), 'utf8')
assert.match(profile, /NavPreferencesPanel/)
assert.match(profile, /profile\.tabNav/)

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

console.log('verify:nav-preferences OK')
