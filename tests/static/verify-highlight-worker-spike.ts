/**
 * SPIKE-1167 — highlight-worker-spike guards.
 * Run: npm run verify:highlight-worker-spike
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const spikePath = join(root, 'docs/specs/015-highlight-worker-spike/spike.md')

assert.ok(existsSync(spikePath))
const spike = readFileSync(spikePath, 'utf8')
assert.match(spike, /## §现状/)
assert.match(spike, /## §Worker 路径/)
assert.match(spike, /## §Decision/)
assert.match(spike, /Defer/)

const optim = readFileSync(join(root, 'docs/优化.md'), 'utf8')
assert.match(optim, /015-highlight-worker-spike/)
assert.match(optim, /暂缓/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:highlight-worker-spike'], 'missing verify:highlight-worker-spike')

console.log('verify:highlight-worker-spike OK')
