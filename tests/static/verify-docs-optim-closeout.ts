/**
 * TASK-1128 — Chat-perf docs closeout guards.
 * Run: npm run verify:docs-optim-closeout
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(existsSync(join(root, 'docs/decisions/chat-perf.md')), 'missing docs/decisions/chat-perf.md')
assert.ok(!existsSync(join(root, 'docs/优化.md')), 'docs/优化.md must not remain in docs/')

const decision = readFileSync(join(root, 'docs/decisions/chat-perf.md'), 'utf8')
assert.match(decision, /v1\.93/)
assert.match(decision, /verify:chat-perf/)

const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.ok(!roadmap.includes('Sprint 候选 `chat-perf`'), 'ROADMAP must not list stale chat-perf sprint')
assert.ok(!roadmap.includes('[优化.md]'), 'ROADMAP must not link docs/优化.md')
assert.ok(!roadmap.includes('.cursorGrowth/archive'), 'ROADMAP must not link archive paths')

const nav = readFileSync(join(root, 'docs/00_文档导航.md'), 'utf8')
assert.ok(!nav.includes('[优化.md]'), 'nav must not list docs/优化.md')
assert.match(nav, /decisions\//)
assert.ok(!nav.includes('[.cursorGrowth/archive'), 'nav must not link archive paths')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:docs-optim-closeout'], 'missing verify script')

console.log('verify:docs-optim-closeout OK')
