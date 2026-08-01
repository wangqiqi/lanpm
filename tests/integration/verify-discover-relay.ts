/**
 * discover_relay：TCP 对端互推 peers/groups，hop≤2 横向同步。
 * Run: npm run verify:discover-relay
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { setDiscoverableGroupsProvider } from '../../src/main/discover/advertProvider.ts'
import {
  clearDiscoverGroupCacheForTests,
  listCachedDiscoverGroups,
  rememberPeerGroups
} from '../../src/main/discover/discoverGroupRegistry.ts'
import { RealNetworkTransport } from '../../src/main/network/real/RealNetworkTransport.ts'

function reservePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        server.close()
        reject(new Error('failed to reserve port'))
        return
      }
      const port = addr.port
      server.close((err) => (err ? reject(err) : resolve(port)))
    })
  })
}

const GROUP_ID = 'relay-hop-test-group'

clearDiscoverGroupCacheForTests()
// Global provider is shared by all transports — keep empty so B/C peer_advert do not
// overwrite A's groupId entry with a different ownerUserId.
setDiscoverableGroupsProvider(() => [])
rememberPeerGroups('user_a', 'Relay A', [
  { groupId: GROUP_ID, name: '中继测试群', type: 'project' }
])

const portA = await reservePort()
const portB = await reservePort()
const portC = await reservePort()

const hostA = new RealNetworkTransport({
  deviceId: 'dev_relay_a',
  userId: 'user_a',
  displayName: 'Relay A',
  listenPort: portA,
  disableUdp: true
})
const hostB = new RealNetworkTransport({
  deviceId: 'dev_relay_b',
  userId: 'user_b',
  displayName: 'Relay B',
  listenPort: portB,
  disableUdp: true
})
const hostC = new RealNetworkTransport({
  deviceId: 'dev_relay_c',
  userId: 'user_c',
  displayName: 'Relay C',
  listenPort: portC,
  disableUdp: true
})

hostA.start()
hostB.start()
hostC.start()

try {
  await hostB.connectManualHost('127.0.0.1', portA)
  await new Promise((r) => setTimeout(r, 500))

  const cachedB = listCachedDiscoverGroups()
  assert.ok(
    cachedB.some((c) => c.advert.groupId === GROUP_ID && c.ownerUserId === 'user_a'),
    'B should cache A group after TCP connect'
  )

  await hostC.connectManualHost('127.0.0.1', portB)
  await new Promise((r) => setTimeout(r, 1200))

  const cachedC = listCachedDiscoverGroups()
  assert.ok(
    cachedC.some((c) => c.advert.groupId === GROUP_ID && c.ownerUserId === 'user_a'),
    'C should receive A group via discover_relay from B (hop≤2)'
  )

  const peersC = await hostC.discoverPeers()
  assert.ok(peersC.some((p) => p.userId === 'user_a'), 'C relay peers should include A')
} finally {
  hostC.stop()
  hostB.stop()
  hostA.stop()
}

console.log('verify:discover-relay OK')
