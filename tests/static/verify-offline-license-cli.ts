/**
 * TASK-938 — offline license CLI + signed license format guards.
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import {
  PLUGIN_LICENSE_FILE_VERSION,
  PLUGIN_LICENSE_TRIAL_DAYS
} from '../../src/shared/plugin/sideloadFormat.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
  version?: string
}
assert.ok(pkg.scripts?.['verify:offline-license-cli'], 'missing verify:offline-license-cli script')

const sideload = readFileSync(join(root, 'src/shared/plugin/sideloadFormat.ts'), 'utf8')
assert.match(sideload, /SignedPluginLicense/)
assert.match(sideload, /MachineLicenseRequest/)
assert.equal(PLUGIN_LICENSE_FILE_VERSION, 1)
assert.equal(PLUGIN_LICENSE_TRIAL_DAYS, 90)

const canonical = readFileSync(join(root, 'src/shared/plugin/licenseCanonical.ts'), 'utf8')
assert.match(canonical, /canonicalizeLicensePayload/)

const verify = readFileSync(join(root, 'src/main/plugin/licenseVerify.ts'), 'utf8')
assert.match(verify, /verifySignedLicenseSignature/)
assert.match(verify, /plugin\.licenseMachineMismatch/)
assert.match(verify, /extractGrantsFromSignedLicense/)

const machine = readFileSync(join(root, 'src/main/plugin/machineId.ts'), 'utf8')
assert.match(machine, /getLocalMachineId/)

const store = readFileSync(join(root, 'src/main/plugin/licenseStore.ts'), 'utf8')
assert.match(store, /extractGrantsFromSignedLicense/)
assert.match(store, /plugin\.licenseInvalidPayload/)

const cmake = join(root, 'tools/lanpm-license/CMakeLists.txt')
assert.ok(existsSync(cmake), 'missing tools/lanpm-license/CMakeLists.txt')
const cliReadme = readFileSync(join(root, 'tools/lanpm-license/README.md'), 'utf8')
assert.match(cliReadme, /collect/)
assert.match(cliReadme, /issue/)
assert.match(cliReadme, /perpetual/)
assert.match(cliReadme, /trial/)

const docs = readFileSync(join(root, 'docs/插件开发.md'), 'utf8')
assert.match(docs, /8\.2\.2/)
assert.match(docs, /90/)
assert.match(docs, /perpetual|永久/)

const zh = readFileSync(join(root, 'src/renderer/src/i18n/locales/zh-CN.ts'), 'utf8')
assert.match(zh, /plugin\.licenseSignatureInvalid/)
assert.match(zh, /plugin\.licenseExpired/)

console.log('verify:offline-license-cli OK')
