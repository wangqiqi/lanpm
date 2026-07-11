/**
 * TASK-254 — A5 discover hardening wiring.
 * Run: npm run verify:discover-a5
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { evaluateDiscoveryHealth } from '../../src/shared/discover/discoveryHealth.ts'
import { normalizeDiscoverSeeds } from '../../src/shared/discover/discoverSeeds.ts'
import { DISCOVER_IPC } from '../../src/shared/discover/channels.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.equal(DISCOVER_IPC.setSeeds, 'discover:setSeeds')

const empty = evaluateDiscoveryHealth({
  mode: 'real',
  bindOk: true,
  multicastOk: true,
  peerCount: 0,
  groupCount: 0
})
assert.equal(empty.suggestManualPeer, true)
assert.deepEqual(normalizeDiscoverSeeds(['10.0.0.1:43124', 'bad']), ['10.0.0.1:43124'])

assert.ok(existsSync(join(root, 'src/shared/discover/discoveryHealth.ts')))
assert.ok(existsSync(join(root, 'src/shared/discover/discoverSeeds.ts')))

const modal = readFileSync(
  join(root, 'src/renderer/src/features/discover/DiscoverModal.tsx'),
  'utf8'
)
assert.match(modal, /onOpenManualPeer/)
assert.match(modal, /HEALTH_REASON_KEYS/)
assert.match(modal, /setSeeds/)
assert.match(modal, /seedsTitle/)

const service = readFileSync(join(root, 'src/main/discover/discoverService.ts'), 'utf8')
assert.match(service, /setDiscoverSeeds/)
assert.match(service, /tryConnectSeeds/)
assert.match(service, /buildHealth/)

const udp = readFileSync(join(root, 'src/main/network/real/udpDiscovery.ts'), 'utf8')
assert.match(udp, /getDiagnostics/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:discover-a5'], 'missing verify:discover-a5')

const feige = readFileSync(join(root, 'docs/飞鸽飞秋.md'), 'utf8')
assert.match(feige, /verify:discover-a5/)

console.log('verify:discover-a5 OK (health · seeds · DiscoverModal · docs)')
