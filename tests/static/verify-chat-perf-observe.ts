/**
 * TASK-1118 — Chat performance observe guards.
 * Run: npm run verify:chat-perf-observe
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const decisionPath = join(root, '.cursorGrowth/decisions/chat-perf.md')

assert.ok(!existsSync(join(root, 'docs/优化.md')), 'docs/优化.md must not remain in docs/')

if (existsSync(decisionPath)) {
  const decision = readFileSync(decisionPath, 'utf8')
  assert.match(decision, /v1\.83\.0.*v1\.93\.0/)
  assert.match(decision, /800ms/)
  assert.match(decision, /500ms/)
  assert.match(decision, /verify:chat-perf-observe/)
  assert.match(decision, /Worker/)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:chat-perf-observe'], 'missing verify:chat-perf-observe script')

console.log('verify:chat-perf-observe OK')
