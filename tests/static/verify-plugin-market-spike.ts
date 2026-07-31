/**
 * TASK-928 — plugin market / sideload / license SPIKE guards.
 * Run: npm run verify:plugin-market-spike
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { PLUGIN_CAPABILITY_IDS } from '../../src/shared/plugin/types.ts'
import {
  PLUGIN_LICENSES_FILE,
  PLUGIN_SIGNATURE_FILE,
  SIDELOAD_PLUGINS_DIR
} from '../../src/shared/plugin/sideloadFormat.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
  version?: string
}
assert.ok(pkg.scripts?.['verify:plugin-market-spike'], 'missing verify:plugin-market-spike script')

assert.ok(PLUGIN_CAPABILITY_IDS.includes('license.feature'))
assert.equal(SIDELOAD_PLUGINS_DIR, 'sideload-plugins')
assert.equal(PLUGIN_SIGNATURE_FILE, 'signature.json')
assert.equal(PLUGIN_LICENSES_FILE, 'plugin-licenses.json')

const paths = readFileSync(join(root, 'src/main/plugin/paths.ts'), 'utf8')
assert.match(paths, /resolveSideloadPluginsRoot/)
assert.match(paths, /SIDELOAD_PLUGINS_DIR/)

const discover = readFileSync(join(root, 'src/main/plugin/discover.ts'), 'utf8')
assert.match(discover, /scanPluginRoot/)
assert.match(discover, /sideload/)
assert.match(discover, /signatureValid/)
assert.match(discover, /licensed/)

const signature = readFileSync(join(root, 'src/main/plugin/signatureVerify.ts'), 'utf8')
assert.match(signature, /verifyPluginDirectorySignature/)
assert.match(signature, /LANPM_PLUGIN_SKIP_VERIFY/)
assert.match(signature, /ed25519|Ed25519|createPublicKey/)

const licenseStore = readFileSync(join(root, 'src/main/plugin/licenseStore.ts'), 'utf8')
assert.match(licenseStore, /importPluginLicense/)
assert.match(licenseStore, /isPluginLicensed/)
assert.match(licenseStore, /assertPaidPluginLicensed/)

const capability = readFileSync(join(root, 'src/main/plugin/capabilityProxy.ts'), 'utf8')
assert.match(capability, /license\.feature/)
assert.match(capability, /assertPaidPluginLicensed/)

const channels = readFileSync(join(root, 'src/shared/plugin/channels.ts'), 'utf8')
assert.match(channels, /importLicense/)
assert.match(channels, /getLicenseStatus/)

const panel = readFileSync(join(root, 'src/renderer/src/features/profile/PluginsPanel.tsx'), 'utf8')
assert.match(panel, /importLicense/)
assert.match(panel, /licenseMissing|licenseActive/)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
assert.match(stub, /importLicense/)
assert.match(stub, /getLicenseStatus/)
assert.match(stub, /license required for paid plugin/)

console.log('verify:plugin-market-spike OK')
