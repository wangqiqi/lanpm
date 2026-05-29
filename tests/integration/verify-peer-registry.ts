/**
 * AUTO-12 — peerRegistry TTL 清理与 excludeDeviceId。
 * Run: npm run verify:peer-registry
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, utimesSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { readPeerRecords } from '../../src/main/network/stub/peerRegistry.ts'
import { STUB_PEERS_DIR } from '../../src/main/network/stub/constants.ts'
import { PEER_TTL_MS } from '../../src/shared/network/constants.ts'

mkdirSync(STUB_PEERS_DIR, { recursive: true })

const now = Date.now()
const freshPath = join(STUB_PEERS_DIR, 'verify-fresh.json')
const stalePath = join(STUB_PEERS_DIR, 'verify-stale.json')
const selfPath = join(STUB_PEERS_DIR, 'verify-self.json')

writeFileSync(
  freshPath,
  JSON.stringify({
    deviceId: 'dev_fresh',
    userId: 'u_fresh',
    displayName: 'Fresh',
    listenPort: 43124,
    capabilities: []
  })
)
writeFileSync(
  stalePath,
  JSON.stringify({
    deviceId: 'dev_stale',
    userId: 'u_stale',
    displayName: 'Stale',
    listenPort: 43124,
    capabilities: []
  })
)
writeFileSync(
  selfPath,
  JSON.stringify({
    deviceId: 'dev_self',
    userId: 'u_self',
    displayName: 'Self',
    listenPort: 43124,
    capabilities: []
  })
)

utimesSync(freshPath, now / 1000, now / 1000)
utimesSync(stalePath, (now - PEER_TTL_MS - 5000) / 1000, (now - PEER_TTL_MS - 5000) / 1000)
utimesSync(selfPath, now / 1000, now / 1000)

const peers = readPeerRecords('dev_self')
const ids = peers.map((p) => p.deviceId)

assert.ok(ids.includes('dev_fresh'), 'fresh peer missing')
assert.ok(!ids.includes('dev_stale'), 'stale peer should be removed')
assert.ok(!ids.includes('dev_self'), 'excludeDeviceId should filter self')
assert.ok(!existsSync(stalePath), 'stale file should be unlinked')

console.log('verify:peer-registry OK')
