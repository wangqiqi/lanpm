/**
 * AI 助手 / L3 流水线回归 playbook 静态守卫（TEST-TODO-15 · SPRINT-81）。
 * 登记既有 verify:ai-* 链；不证明真 LLM / Electron 全路径 E2E 已在 CI 验完。
 * Run: npm run verify:ai-regression-playbook
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>
}

const AI_VERIFY_SCRIPTS = [
  'verify:ai-offline-gate',
  'verify:ai-stream-ipc',
  'verify:ai-desensitize',
  'verify:ai-context',
  'verify:ai-thread-service',
  'verify:ai-subtask',
  'verify:ai-patrol',
  'verify:ai-endpoint-probe',
  'verify:ai-assistant-patrol-subtask',
  'verify:ai-orchestration-spike',
  'verify:ai-pipeline',
  'verify:ai-pipeline-human',
  'verify:ai-regression-playbook'
] as const

for (const key of AI_VERIFY_SCRIPTS) {
  assert.equal(typeof pkg.scripts[key], 'string', `missing package.json script ${key}`)
}

for (const key of AI_VERIFY_SCRIPTS) {
  const rel = pkg.scripts[key]!
  const tsName = rel.replace(/.*tests\/static\//, '').replace(/\.ts.*/, '.ts')
  if (!rel.includes('verify-ai-regression-playbook')) {
    const path = join(root, 'tests/static', tsName)
    assert.ok(existsSync(path), `missing runner file ${tsName}`)
  }
}

const docs05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
assert.match(docs05, /#### 1\.2\.7 AI/, 'docs/05 §1.2.7 AI section')
assert.match(docs05, /verify:ai-regression-playbook/, 'docs/05 cites ai regression playbook')
assert.match(docs05, /聚合与手验/, 'docs/05 §1.2.7 aggregation subsection')
assert.match(docs05, /ai_assistant_handtest_TEMPLATE/, 'docs/05 cites hand-test template')

for (const key of AI_VERIFY_SCRIPTS) {
  if (key === 'verify:ai-regression-playbook') continue
  assert.match(docs05, new RegExp(key.replace(':', '\\:')), `docs/05 lists ${key}`)
}

const docs02 = readFileSync(join(root, 'docs/02_技术实现建议.md'), 'utf8')
assert.match(docs02, /verify:ai-regression-playbook/, 'docs/02 cites ai regression playbook')

const docs06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(docs06, /verify:ai-pipeline/, 'docs/06 cites ai pipeline guard')

const templatePath = join(
  root,
  '.cursorGrowth/archive/templates/ai_assistant_handtest_TEMPLATE.md'
)
assert.ok(existsSync(templatePath), 'hand-test template exists in Growth archive/templates')

console.log('verify:ai-regression-playbook: ok')
