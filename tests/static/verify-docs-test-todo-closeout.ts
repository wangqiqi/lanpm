/**
 * TEST-TODO-17 · SPRINT-83 — 测试债务终局守卫。
 * 禁止仓库根《测试.md》回退；docs/05 §9 不得再以 plan TEST-TODO 为活跟踪。
 * Run: npm run verify:docs-test-todo-closeout
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot

assert.ok(!existsSync(join(root, '测试.md')), 'root 测试.md must not remain (closed in SPRINT-83)')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>
}
assert.equal(typeof pkg.scripts['verify:docs-test-todo-closeout'], 'string', 'missing package.json script')

const docs05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
assert.match(docs05, /## 9\. 已收口补测账本/, 'docs/05 §9 closed ledger heading')
assert.match(docs05, /verify:docs-test-todo-closeout/, 'docs/05 cites closeout guard')
assert.ok(!docs05.includes('终局在 plan **SPRINT-83**'), 'docs/05 must not point live closeout at plan SPRINT-83')
assert.ok(!docs05.includes('对齐 plan TEST-TODO'), 'docs/05 §9 must not use plan TEST-TODO as live tracker title')

const section9 = docs05.split(/## 9\./)[1]?.split(/## 10\./)[0] ?? ''
assert.ok(section9.length > 0, 'docs/05 §9 section extractable')
assert.ok(!section9.includes('⬜'), 'docs/05 §9 must have no open TODO marks')

const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
assert.match(changelog, /verify:docs-test-todo-closeout/, 'CHANGELOG cites closeout guard')

const planPath = join(root, '.cursorGrowth/plan.md')
if (existsSync(planPath)) {
  const plan = readFileSync(planPath, 'utf8')
  assert.ok(!/TEST-TODO/.test(plan), 'local plan.md must not track TEST-TODO after closeout')
}

console.log('verify:docs-test-todo-closeout: ok')
