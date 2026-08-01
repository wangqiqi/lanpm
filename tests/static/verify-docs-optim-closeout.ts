/**
 * TASK-1128 — Docs optim closeout guards.
 * Run: npm run verify:docs-optim-closeout
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(
  existsSync(join(root, 'docs/specs/010-docs-optim-closeout/spec.md')),
  'missing spec'
)

const optim = readFileSync(join(root, 'docs/优化.md'), 'utf8')
assert.match(optim, /最后对齐.*v1\.83\.0–v1\.87\.0/)
assert.match(optim, /\| 状态 \|/)
assert.match(optim, /历史评审快照/)
assert.match(optim, /chat-perf-store-hooks/)
assert.match(optim, /verify:docs-optim-closeout/)
assert.match(optim, /v1\.88\.0.*docs-optim-closeout/)

const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(roadmap, /v1\.83–v1\.87 已交付/)
assert.ok(!roadmap.includes('Sprint 候选 `chat-perf`'), 'ROADMAP must not list stale chat-perf sprint')

const nav = readFileSync(join(root, 'docs/00_文档导航.md'), 'utf8')
assert.match(nav, /backlog SSOT/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:docs-optim-closeout'], 'missing verify script')

console.log('verify:docs-optim-closeout OK')
