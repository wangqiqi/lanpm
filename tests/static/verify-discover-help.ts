/**
 * 发现页组网帮助（SPRINT-DISCOVER-HELP）。
 * Run: npm run verify:discover-help
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const content = readFileSync(
  join(root, 'src/renderer/src/features/setup/NetworkPrereqContent.tsx'),
  'utf8'
)
const step = readFileSync(
  join(root, 'src/renderer/src/features/setup/NetworkPrereqStep.tsx'),
  'utf8'
)
const helpModal = readFileSync(
  join(root, 'src/renderer/src/features/discover/NetworkHelpModal.tsx'),
  'utf8'
)
const pairingPanel = readFileSync(
  join(root, 'src/renderer/src/features/discover/DiscoverPairingPanel.tsx'),
  'utf8'
)
const zh = readFileSync(join(root, 'src/renderer/src/i18n/locales/zh-CN.ts'), 'utf8')
const pairingDoc = readFileSync(join(root, 'docs/04_交互与UI约定.md'), 'utf8')

assert.match(content, /NetworkPrereqContent/)
assert.match(content, /SwitchIllustration/)
assert.match(content, /Segmented/)
assert.match(step, /NetworkPrereqContent/)
assert.match(helpModal, /NetworkPrereqContent/)
assert.match(helpModal, /discover\.netHelpTitle/)
assert.match(pairingPanel, /NetworkHelpModal/)
assert.match(pairingPanel, /discover\.netHelpLink/)
assert.match(zh, /discover\.netHelpLink/)
assert.match(zh, /discover\.netHelpTitle/)
assert.match(pairingDoc, /发现页.*组网|组网.*发现|NetworkHelpModal/s)

console.log('verify:discover-help OK')
