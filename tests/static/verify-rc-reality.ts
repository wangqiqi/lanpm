/**
 * AUTO-05 — PRD §1.3.1 与 package.json 依赖一致。
 * Yjs 已引入（SPRINT-TASK-CRDT / TASK-156）；WebRTC 仍禁止。
 * Run: npm run verify:rc-reality
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  version: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}
const deps = { ...pkg.dependencies, ...pkg.devDependencies }

const forbidden = ['webrtc', 'simple-peer']
for (const name of forbidden) {
  assert.ok(!deps[name], `unexpected post-RC dependency: ${name}`)
}

assert.ok(deps['yjs'], 'missing yjs (TASK-156 / SPRINT-TASK-CRDT)')
assert.ok(deps['better-sqlite3'], 'missing better-sqlite3')
assert.ok(deps['electron'], 'missing electron')
assert.ok(deps['react'], 'missing react')

const prd = readFileSync(join(root, 'docs/01_产品需求文档.md'), 'utf8')
assert.match(prd, /1\.3\.1 实现现状/, 'docs/01 missing implementation reality section (§1.3.1)')
assert.match(prd, /SQLite 为唯一持久化层|SQLite 为唯一持久化/, 'docs/01 should document SQLite-only RC')
assert.match(prd, /Yjs.*已引入|已引入.*[Yy]js|task_crdt/, 'docs/01 should document Yjs enabled for task_crdt')
assert.ok(!/Yjs\/WebRTC 为 v1\.1 可选/.test(prd), 'docs/01 must not still mark Yjs as optional-only')

const rcMinor = pkg.version.match(/rc\.(\d+)/)?.[1]
if (rcMinor) {
  assert.ok(Number(rcMinor) >= 12, 'RC section header should be updated when rc number grows')
}

console.log(`verify:rc-reality OK (v${pkg.version}, yjs=${deps['yjs']}, ${Object.keys(deps).length} deps checked)`)
