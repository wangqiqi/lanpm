/**
 * docs/02 §16 功能矩阵 ↔ docs/06 §7 / 已交付插件 — 防回退守卫。
 * Run: npm run verify:docs-matrix
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const doc02 = readFileSync(join(root, 'docs/02_技术实现建议.md'), 'utf8')
const doc06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')

assert.ok(
  existsSync(join(root, 'plugins/lanpm.mindmap/package.json')),
  'plugins/lanpm.mindmap must exist'
)
assert.ok(
  !/\|\s*思维导图\s*\|\s*❌/.test(doc02),
  'docs/02 §16: mindmap must not be ❌ when lanpm.mindmap is shipped'
)
assert.match(doc02, /\|\s*思维导图\s*\|\s*✅/, 'docs/02 §16: mindmap row must be ✅')
assert.match(doc06, /导图 Layer C 已有/, 'docs/06 §7: mindmap delivered marker')
assert.match(
  doc02,
  /verify:docs-matrix/,
  'docs/02 §16.8 must reference verify:docs-matrix guard'
)

console.log('verify:docs-matrix OK')
