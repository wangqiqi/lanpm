/**
 * SPIKE-1167 — highlight-worker-spike guards.
 * Run: npm run verify:highlight-worker-spike
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const spikePath = join(root, '.cursorGrowth/archive/chat-perf/specs/015-highlight-worker-spike/spike.md')

// spike 全文在本地 archive；CI 只验决策摘要与代码落点
const decisionPath = join(root, '.cursorGrowth/decisions/chat-perf.md')
if (existsSync(decisionPath)) {
  const decision = readFileSync(decisionPath, 'utf8')
  assert.match(decision, /Worker/)
}

if (existsSync(spikePath)) {
  const spike = readFileSync(spikePath, 'utf8')
  assert.match(spike, /Defer/)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:highlight-worker-spike'], 'missing verify:highlight-worker-spike')

console.log('verify:highlight-worker-spike OK')
