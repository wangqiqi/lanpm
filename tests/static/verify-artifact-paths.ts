/**
 * SPRINT-74 — build artifacts live under .lanpm/artifact/ (SSOT: scripts/lanpm-artifact-paths.mjs).
 * Run: npm run verify:artifact-paths
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PACKAGE_MAIN_REL,
  builderDistDir,
  coverageDir,
  playwrightTestResultsDir,
  viteOutDir
} from '../../scripts/lanpm-artifact-paths.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

const pkg = JSON.parse(read('package.json')) as { main?: string }
assert.equal(pkg.main, `./${PACKAGE_MAIN_REL}`, 'package.json main must match SSOT')

const builder = read('electron-builder.yml')
assert.match(builder, /output:\s*\.lanpm\/artifact\/dist/m, 'electron-builder output path')

const playwright = read('playwright.config.ts')
assert.match(playwright, /lanpm-artifact-paths/, 'playwright must use artifact SSOT')

const vite = read('electron.vite.config.ts')
assert.match(vite, /\.lanpm\/artifact/, 'electron-vite must output under .lanpm/artifact')
assert.doesNotMatch(vite, /join\(root,\s*['"]out\//, 'electron-vite must not hardcode root out/')

const vitest = read('vitest.config.ts')
assert.match(vitest, /lanpm-artifact-paths/, 'vitest must use artifact/coverage SSOT')
assert.doesNotMatch(vitest, /reportsDirectory:\s*['"]coverage['"]/, 'vitest must not use root coverage/')

const forbidden = [
  { file: 'tests/e2e/fixtures/lanpmElectron.ts', pattern: /join\(root,\s*['"]out\// },
  { file: 'scripts/measure-perf-ui.mjs', pattern: /['"]out\/main/ },
  { file: 'scripts/linux-installer-smoke.mjs', pattern: /join\(root,\s*['"]dist/ }
]
for (const { file, pattern } of forbidden) {
  assert.doesNotMatch(read(file), pattern, `${file} must not use legacy artifact path`)
}

assert.equal(viteOutDir(root), join(root, '.lanpm', 'artifact', 'out'))
assert.equal(builderDistDir(root), join(root, '.lanpm', 'artifact', 'dist'))
assert.equal(playwrightTestResultsDir(root), join(root, '.lanpm', 'artifact', 'test-results'))
assert.equal(coverageDir(root), join(root, '.lanpm', 'coverage'))

console.log('verify:artifact-paths OK')
