/**
 * TASK-6303 — Free backup plugin shell (lanpm.backup).
 * Run: npm run verify:backup-sku
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { parsePluginManifest } from '../../src/shared/plugin/validateManifest.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const manifest = JSON.parse(readFileSync(join(root, 'plugins/lanpm.backup/plugin.json'), 'utf8'))
const parsed = parsePluginManifest(manifest)
assert.equal(parsed?.id, 'lanpm.backup')
assert.equal(parsed?.pricing, 'free')
assert.ok(parsed?.slots.includes('profile.data.backup'))

const stub = readFileSync(join(root, 'src/renderer/src/plugin/builtins/BackupStub.tsx'), 'utf8')
assert.match(stub, /lanpm\.backup/)
assert.doesNotMatch(stub, /isPluginLicenseActive/)
assert.doesNotMatch(stub, /license-cta/)

const panel = readFileSync(
  join(root, 'src/renderer/src/features/profile/DataStoragePanel.tsx'),
  'utf8'
)
assert.match(panel, /usePluginView\('lanpm\.backup'\)/)
assert.match(panel, /data-testid="data-backup-section"/)
assert.match(panel, /profile\.data\.backup/)
assert.doesNotMatch(panel, /assertPaidPluginLicensed/)
assert.doesNotMatch(panel, /backup-license-cta/)

const proxy = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
assert.ok(
  !proxy.includes("assertPaidPluginLicensed('lanpm.backup'"),
  'free backup must not use paid license gate'
)

const registry = readFileSync(join(root, 'src/renderer/src/plugin/registry.ts'), 'utf8')
assert.match(registry, /lanpm\.backup.*BackupStub/)

const enabled = readFileSync(join(root, 'src/shared/plugin/enabledDefaults.ts'), 'utf8')
assert.match(enabled, /'lanpm\.backup'/, 'free backup must default-enable')

const docs06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(docs06, /lanpm\.backup/)
assert.match(docs06, /SPRINT-63/)

const docs07 = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')
assert.match(docs07, /lanpm\.backup/)

const readme = readFileSync(join(root, 'README.md'), 'utf8')
assert.match(readme, /lanpm\.backup/)
assert.match(readme, /on by default/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:backup-sku'], 'missing verify:backup-sku script')

console.log('verify:backup-sku OK')
