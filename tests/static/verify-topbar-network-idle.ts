/**
 * TASK-1160 — TopBar network idle poll guards.
 * Run: npm run verify:topbar-network-idle
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(existsSync(join(root, 'docs/specs/014-topbar-network-idle/spec.md')))
assert.ok(existsSync(join(root, 'src/renderer/src/layout/useNetworkIdlePoll.ts')))

const hook = readFileSync(join(root, 'src/renderer/src/layout/useNetworkIdlePoll.ts'), 'utf8')
assert.match(hook, /NETWORK_POLL_MS/)
assert.match(hook, /visibilityState === 'hidden'/)
assert.match(hook, /visibilitychange/)

const topBar = readFileSync(join(root, 'src/renderer/src/layout/TopBar.tsx'), 'utf8')
assert.match(topBar, /useNetworkIdlePoll/)
assert.ok(!topBar.includes('setInterval(() => void refreshNetwork'), 'TopBar must not use bare network setInterval')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:topbar-network-idle'], 'missing verify:topbar-network-idle script')

console.log('verify:topbar-network-idle OK')
