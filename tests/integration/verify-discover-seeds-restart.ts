/**
 * 发现种子：模拟重启后凭持久化 seed 重连，peer_advert 应再次填充群组缓存。
 * Run: npm run verify:discover-seeds-restart
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { setDiscoverableGroupsProvider } from '../../src/main/discover/advertProvider.ts'
import {
  clearDiscoverGroupCacheForTests,
  listCachedDiscoverGroups
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

const GROUP_ID = 'seed-restart-test-group'

setDiscoverableGroupsProvider(() => [
  { groupId: GROUP_ID, name: '种子重连群', type: 'project' }
])

const portA = await reservePort()
const portB = await reservePort()

const hostA = new RealNetworkTransport({
  deviceId: 'dev_seed_a',
  userId: 'user_a',
  displayName: 'Seed A',
  listenPort: portA,
  disableUdp: true
})

let hostB = new RealNetworkTransport({
  deviceId: 'dev_seed_b',
  userId: 'user_b',
  displayName: 'Seed B',
  listenPort: portB,
  disableUdp: true
})

hostA.start()
hostB.start()

const seedAddress = `127.0.0.1:${portA}`

try {
  await hostB.connectManualHost('127.0.0.1', portA)
  await new Promise((r) => setTimeout(r, 400))

  assert.ok(
    listCachedDiscoverGroups().some(
      (c) => c.advert.groupId === GROUP_ID && c.ownerUserId === 'user_a'
    ),
    'first connect should cache remote groups'
  )

  hostB.stop()
  clearDiscoverGroupCacheForTests()

  const portB2 = await reservePort()
  hostB = new RealNetworkTransport({
    deviceId: 'dev_seed_b2',
    userId: 'user_b',
    displayName: 'Seed B2',
    listenPort: portB2,
    disableUdp: true,
    getRelaySeeds: () => [seedAddress]
  })
  hostB.start()

  const { host, port } = { host: '127.0.0.1', port: portA }
  await hostB.connectManualHost(host, port)

  const deadline = Date.now() + 2_500
  let restored = false
  while (Date.now() < deadline) {
    restored = listCachedDiscoverGroups().some(
      (c) => c.advert.groupId === GROUP_ID && c.ownerUserId === 'user_a'
    )
    if (restored) break
    await new Promise((r) => setTimeout(r, 100))
  }

  assert.ok(
    restored,
    'after simulated restart, seed reconnect + peer_advert should restore groups'
  )
} finally {
  hostB.stop()
  hostA.stop()
}

console.log('verify:discover-seeds-restart OK')
