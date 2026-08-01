/**
 * TASK-1221 — 视觉截图与 release-gate 分工（策略守卫）。
 * Run: npm run verify:release-screenshots-policy
 *
 * 决策：verify:visual-screenshots 不进 CI / verify:release-gate；打 tag 前本地必跑（见 docs/05 §1.3.1）。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const gate = readFileSync(join(root, 'tests/runners/verify-release-gate.ts'), 'utf8')
const stepsBlock = gate.match(/const steps = \[[\s\S]*?\] as const/)?.[0] ?? ''
assert.ok(stepsBlock.length > 0, 'verify-release-gate.ts must define steps array')
assert.doesNotMatch(
  stepsBlock,
  /verify:visual-screenshots/,
  'verify:release-gate steps must not run verify:visual-screenshots (TASK-1221 local-only policy)'
)
assert.match(
  gate,
  /verify:release-screenshots-policy/,
  'verify:release-gate must include release-screenshots-policy guard (TASK-1221)'
)

const docs05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
assert.match(
  docs05,
  /1\.3\.1 视觉截图策略/,
  'docs/05 must document §1.3.1 visual screenshot policy'
)
assert.match(
  docs05,
  /verify:visual-screenshots/,
  'docs/05 must reference verify:visual-screenshots'
)
assert.match(docs05, /xvfb-run/, 'docs/05 must document xvfb-run for Linux headless capture')
assert.match(
  docs05,
  /打 tag|发版前/,
  'docs/05 must state pre-tag local screenshot requirement'
)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8') as string) as {
  scripts?: Record<string, string>
}
assert.ok(
  pkg.scripts?.['verify:release-screenshots-policy'],
  'missing verify:release-screenshots-policy script'
)

console.log('verify:release-screenshots-policy OK')
