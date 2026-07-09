/**
 * SPIKE-STUB-01 / TASK-050 — browserLanpmStub 假成功路径静态守卫。
 * Run: npm run verify:stub-behavior
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const stubSrc = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')

assert.match(stubSrc, /FILE_STORAGE_KEY/, 'bookmark persistence key required')
assert.match(stubSrc, /writeGroupFiles/, 'addBookmark must persist via writeGroupFiles')
assert.match(
  stubSrc,
  /listFiles:\s*async\s*\(groupId,\s*category\)/,
  'listFiles must read persisted files'
)
assert.doesNotMatch(
  stubSrc,
  /listFiles:\s*async\s*\(\)\s*=>\s*\[\]/,
  'listFiles must not always return []'
)

assert.match(stubSrc, /stub\.manualPeerPreviewOnly/, 'connectManualPeer must refuse preview peers')
assert.doesNotMatch(
  stubSrc,
  /peerCount:\s*1/,
  'connectManualPeer must not fake peerCount:1'
)

assert.match(
  stubSrc,
  /clearGroupMessages:\s*async\s*\(groupId\)/,
  'clearGroupMessages must accept groupId'
)
assert.match(
  stubSrc,
  /writeChatMessages\(groupId,\s*\[\]\)/,
  'clearGroupMessages must clear stub chat store'
)
assert.doesNotMatch(
  stubSrc,
  /clearGroupMessages:\s*async\s*\(\)\s*=>\s*0/,
  'clearGroupMessages must not always return 0'
)

assert.match(
  stubSrc,
  /stub\.importBundleElectronOnly/,
  'importGroupBundle must throw Electron-only'
)
assert.doesNotMatch(
  stubSrc,
  /importGroupBundle:\s*async\s*\(\)\s*=>\s*\(\{/,
  'importGroupBundle must not return fake success object'
)

assert.match(stubSrc, /err\.apiKeyRequired/, 'saveAiConfig must require apiKey')
assert.doesNotMatch(
  stubSrc,
  /saveAiConfig:\s*async\s*\(input\)\s*=>\s*\(\{[\s\S]*?hasApiKey:\s*true/,
  'saveAiConfig must not always set hasApiKey:true'
)

console.log('verify:stub-behavior OK (5 false-success guards)')
