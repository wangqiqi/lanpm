/**
 * 跨子网手动节点：TCP 握手应填充 discoverPeers 与群组缓存。
 * Run: npm run verify:manual-peer-discover
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { setDiscoverableGroupsProvider } from '../../src/main/discover/advertProvider.ts'
import { listCachedDiscoverGroups } from '../../src/main/discover/discoverGroupRegistry.ts'
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

const GROUP_ID = 'cross-subnet-test-group'

setDiscoverableGroupsProvider(() => [
  { groupId: GROUP_ID, name: '跨子网测试群', type: 'project' }
])

const portA = await reservePort()
const portB = await reservePort()

const hostA = new RealNetworkTransport({
  deviceId: 'dev_manual_a',
  userId: 'user_a',
  displayName: 'Host A',
  listenPort: portA,
  disableUdp: true
})
const hostB = new RealNetworkTransport({
  deviceId: 'dev_manual_b',
  userId: 'user_b',
  displayName: 'Host B',
  listenPort: portB,
  disableUdp: true
})

hostA.start()
hostB.start()

try {
  await hostA.connectManualHost('127.0.0.1', portB)
  await new Promise((r) => setTimeout(r, 400))

  const peers = await hostA.discoverPeers()
  const remote = peers.find((p) => p.userId === 'user_b')
  assert.ok(remote, 'manual TCP peer should appear in discoverPeers with userId')
  assert.equal(remote.displayName, 'Host B')
  assert.ok(remote.groups?.some((g) => g.groupId === GROUP_ID), 'groups advertised over TCP')

  const cached = listCachedDiscoverGroups()
  assert.ok(
    cached.some((c) => c.advert.groupId === GROUP_ID && c.ownerUserId === 'user_b'),
    'rememberPeerGroups via TCP handshake'
  )
} finally {
  hostA.stop()
  hostB.stop()
}

console.log('verify:manual-peer-discover OK')
