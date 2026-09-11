/**
 * 会议 / LiveKit 回归 playbook 静态守卫（TEST-TODO-14 · SPRINT-80）。
 * 登记既有 verify:meeting-* 链；不证明公网 SFU / 多人真网已 CI 验完。
 * Run: npm run verify:meeting-regression-playbook
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>
}

const MEETING_VERIFY_SCRIPTS = [
  'verify:meeting-spike',
  'verify:meeting-plugin',
  'verify:meeting-mesh-poc',
  'verify:meeting-livekit-pro',
  'verify:meeting-ux',
  'verify:chat-voice',
  'verify:meeting-media-v2',
  'verify:meeting-recording',
  'verify:meeting-schedule',
  'verify:meeting-productization',
  'verify:meeting-regression-playbook'
] as const

for (const key of MEETING_VERIFY_SCRIPTS) {
  assert.equal(typeof pkg.scripts[key], 'string', `missing package.json script ${key}`)
}

for (const key of MEETING_VERIFY_SCRIPTS) {
  const rel = pkg.scripts[key]!
  const tsName = rel.replace(/.*tests\/static\//, '').replace(/\.ts.*/, '.ts')
  if (!rel.includes('verify-meeting-regression-playbook')) {
    const path = join(root, 'tests/static', tsName)
    assert.ok(existsSync(path), `missing runner file ${tsName}`)
  }
}

const docs05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
assert.match(docs05, /#### 1\.2\.9 会议/, 'docs/05 §1.2.9 meeting section')
assert.match(docs05, /verify:meeting-regression-playbook/, 'docs/05 cites meeting regression playbook')

for (const key of MEETING_VERIFY_SCRIPTS) {
  if (key === 'verify:meeting-regression-playbook') continue
  assert.match(docs05, new RegExp(key.replace(':', '\\:')), `docs/05 lists ${key}`)
}

const docs06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(docs06, /### 3\.5/, 'docs/06 §3.5 meeting rhythm')
assert.match(docs06, /verify:meeting-livekit-pro/, 'docs/06 cites livekit pro guard')

const pluginReadme = join(root, 'plugins/lanpm.meeting/README.md')
assert.ok(existsSync(pluginReadme), 'plugins/lanpm.meeting README exists')
const pluginDoc = readFileSync(pluginReadme, 'utf8')
assert.match(pluginDoc, /verify:meeting-livekit-pro/, 'meeting plugin README cites verify')

console.log('verify:meeting-regression-playbook: ok')
