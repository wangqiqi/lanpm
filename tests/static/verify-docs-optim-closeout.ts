/**
 * TASK-1128 — Chat-perf docs closeout guards.
 * Run: npm run verify:docs-optim-closeout
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(!existsSync(join(root, 'docs/优化.md')), 'docs/优化.md must not remain in docs/')
assert.ok(!existsSync(join(root, 'docs/specs')), 'docs/specs must live under .cursorGrowth/specs')
assert.ok(!existsSync(join(root, 'docs/decisions')), 'docs/decisions must live under .cursorGrowth/decisions')

const wf = JSON.parse(readFileSync(join(root, '.cursor/config/workflow.json'), 'utf8')) as {
  sdd?: { specs_dir?: string }
}
assert.equal(wf.sdd?.specs_dir, '.cursorGrowth/specs', 'workflow sdd.specs_dir')

const localDecision = join(root, '.cursorGrowth/decisions/chat-perf.md')
if (existsSync(localDecision)) {
  const decision = readFileSync(localDecision, 'utf8')
  assert.match(decision, /v1\.93/)
  assert.match(decision, /verify:chat-perf/)
}

const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.ok(!roadmap.includes('Sprint 候选 `chat-perf`'), 'ROADMAP must not list stale chat-perf sprint')
assert.ok(!roadmap.includes('[优化.md]'), 'ROADMAP must not link docs/优化.md')
assert.ok(!roadmap.includes('./decisions/'), 'ROADMAP must not link docs/decisions')

const nav = readFileSync(join(root, 'docs/00_文档导航.md'), 'utf8')
assert.ok(!nav.includes('[优化.md]'), 'nav must not list docs/优化.md')
assert.ok(!nav.includes('[decisions/]'), 'nav must not list docs/decisions')
assert.ok(!nav.includes('[.cursorGrowth/archive'), 'nav must not link archive paths')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:docs-optim-closeout'], 'missing verify script')

console.log('verify:docs-optim-closeout OK')
