/**
 * TASK-1118 — Chat performance observe guards.
 * Run: npm run verify:chat-perf-observe
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const requiredFiles = [
  'docs/specs/009-chat-perf-observe/spec.md',
  'docs/templates/chat-perf-regression.md',
  'docs/chat-perf-baseline.md'
]

for (const f of requiredFiles) {
  assert.ok(existsSync(join(root, f)), `missing ${f}`)
}

const spec = readFileSync(join(root, 'docs/specs/009-chat-perf-observe/spec.md'), 'utf8')
assert.match(spec, /## Budget/)
assert.match(spec, /§10\.4/)
assert.match(spec, /verify:chat-perf-observe/)
assert.match(spec, /chat-perf-observe/)
assert.match(spec, /800ms/)
assert.match(spec, /500ms/)

const regression = readFileSync(
  join(root, 'docs/templates/chat-perf-regression.md'),
  'utf8'
)
assert.match(regression, /packaged/i)
assert.match(regression, /500/)
assert.match(regression, /Performance/)
assert.match(regression, /Memory/)
assert.match(regression, /chat-perf-baseline/)

const baseline = readFileSync(join(root, 'docs/chat-perf-baseline.md'), 'utf8')
assert.match(baseline, /v1\.86/)
assert.match(baseline, /历史记录/)
assert.match(baseline, /009-chat-perf-observe/)

const optim = readFileSync(join(root, 'docs/优化.md'), 'utf8')
assert.match(optim, /verify:chat-perf-observe/)
assert.match(optim, /009-chat-perf-observe/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:chat-perf-observe'], 'missing verify:chat-perf-observe script')

console.log('verify:chat-perf-observe OK')
