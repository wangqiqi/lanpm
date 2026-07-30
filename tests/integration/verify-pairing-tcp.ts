/**
 * TCP pairing_resolve 跨网段兜底（无 UDP）。
 * Run: npm run verify:pairing-tcp
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

const GROUP_ID = 'pairing-tcp-group'

setDiscoverableGroupsProvider(() => [
  { groupId: GROUP_ID, name: 'TCP配对群', type: 'project' }
])

const portA = await reservePort()
const portB = await reservePort()

const hostA = new RealNetworkTransport({
  deviceId: 'dev_tcp_host',
  userId: 'user_tcp_host',
  displayName: 'TCP Host',
  listenPort: portA,
  disableUdp: true
})
const hostB = new RealNetworkTransport({
  deviceId: 'dev_tcp_joiner',
  userId: 'user_tcp_joiner',
  displayName: 'TCP Joiner',
  listenPort: portB,
  disableUdp: true
})

hostA.start()
hostB.start()

const session = hostA.startPairingSession()

try {
  const peer = await hostB.connectManualHostWithPairing('127.0.0.1', portA, session.code)
  assert.equal(peer.userId, 'user_tcp_host')
  assert.ok(peer.groups?.some((g) => g.groupId === GROUP_ID), 'groups via pairing_resolve_ok')

  const peers = await hostB.discoverPeers()
  assert.ok(peers.some((p) => p.userId === 'user_tcp_host'), 'discoverPeers after TCP pairing')

  const cached = listCachedDiscoverGroups()
  assert.ok(
    cached.some((c) => c.advert.groupId === GROUP_ID && c.ownerUserId === 'user_tcp_host'),
    'rememberPeerGroups after TCP pairing'
  )

  await assert.rejects(
    hostB.connectManualHostWithPairing('127.0.0.1', portA, session.code),
    /pairing_resolve/
  )

  console.log('verify:pairing-tcp OK')
} finally {
  hostA.stop()
  hostB.stop()
}
