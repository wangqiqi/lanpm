/**
 * Setup 网络前置图示（SPRINT-SETUP-NET）。
 * Run: npm run verify:setup-net
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const wizard = readFileSync(join(root, 'src/renderer/src/features/setup/SetupWizard.tsx'), 'utf8')
const netStep = readFileSync(
  join(root, 'src/renderer/src/features/setup/NetworkPrereqStep.tsx'),
  'utf8'
)
const netContent = readFileSync(
  join(root, 'src/renderer/src/features/setup/NetworkPrereqContent.tsx'),
  'utf8'
)
const css = readFileSync(
  join(root, 'src/renderer/src/features/setup/SetupWizard.module.css'),
  'utf8'
)
const zh = readFileSync(join(root, 'src/renderer/src/i18n/locales/zh-CN.ts'), 'utf8')
const en = readFileSync(join(root, 'src/renderer/src/i18n/locales/en-US.ts'), 'utf8')
const pairingDoc = readFileSync(join(root, 'docs/配对码.md'), 'utf8')

assert.match(wizard, /NetworkPrereqStep/)
assert.match(wizard, /step === 'network'/)
assert.match(wizard, /setStep\('profile'\)/)
assert.match(netStep, /NetworkPrereqContent/)
assert.match(netContent, /Segmented/)
assert.match(netContent, /SwitchIllustration/)
assert.match(netContent, /RouterIllustration/)
assert.match(netContent, /HotspotIllustration/)
assert.match(netStep, /setup\.netContinue/)
assert.match(netStep, /setup\.netSkip/)
assert.match(css, /\.netIllustration/)

for (const key of [
  'setup.netTitle',
  'setup.netScenarioSwitch',
  'setup.netScenarioRouter',
  'setup.netScenarioHotspot',
  'setup.netContinue',
  'setup.netSkip'
]) {
  assert.match(zh, new RegExp(`'${key}'`))
  assert.match(en, new RegExp(`'${key}'`))
}

assert.match(pairingDoc, /SPRINT-SETUP-NET.*✅/)

console.log('verify:setup-net OK')
