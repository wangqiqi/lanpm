/**
 * AUTO-05 — PRD §1.3.1 RC 现状与 package.json / 依赖一致（无 Yjs/WebRTC 误装）。
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

const forbidden = ['yjs', 'webrtc', 'simple-peer']
for (const name of forbidden) {
  assert.ok(!deps[name], `unexpected post-RC dependency: ${name}`)
}

assert.ok(deps['better-sqlite3'], 'missing better-sqlite3')
assert.ok(deps['electron'], 'missing electron')
assert.ok(deps['react'], 'missing react')

const prd = readFileSync(join(root, 'docs/01_产品需求文档.md'), 'utf8')
assert.match(prd, /RC 实现现状/, 'docs/01 missing RC reality section')
assert.match(prd, /SQLite 为唯一持久化层|SQLite 为唯一持久化/, 'docs/01 should document SQLite-only RC')
assert.match(prd, /Yjs|WebRTC.*v1\.1|post-RC/i, 'docs/01 should mark Yjs/WebRTC as post-RC')

const rcMinor = pkg.version.match(/rc\.(\d+)/)?.[1]
if (rcMinor) {
  assert.ok(Number(rcMinor) >= 12, 'RC section header should be updated when rc number grows')
}

console.log(`verify:rc-reality OK (v${pkg.version}, ${Object.keys(deps).length} deps checked)`)
