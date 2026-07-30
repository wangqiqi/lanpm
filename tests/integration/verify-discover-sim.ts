/**
 * VirtualLan 2-node：同子网 UDP 配对码全链 + UDP 自动发现。
 * Run: npm run verify:discover-sim
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { setDiscoverableGroupsProvider } from '../../src/main/discover/advertProvider.ts'
import { listCachedDiscoverGroups } from '../../src/main/discover/discoverGroupRegistry.ts'
import { RealNetworkTransport } from '../../src/main/network/real/RealNetworkTransport.ts'
import { DISCOVERY_INTERVAL_MS } from '../../src/shared/network/constants.ts'
import {
  VirtualLanBus,
  createVirtualUdpSocket,
  fixtureVirtualIp
} from '../helpers/VirtualLan.ts'

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

const GROUP_ID = 'discover-sim-group'

setDiscoverableGroupsProvider(() => [
  { groupId: GROUP_ID, name: '仿真发现群', type: 'project' }
])

const bus = new VirtualLanBus()
const ipA = fixtureVirtualIp(1, 10)
const ipB = fixtureVirtualIp(1, 11)

const portA = await reservePort()
const portB = await reservePort()

function virtualTransport(
  ip: string,
  opts: { deviceId: string; userId: string; displayName: string; listenPort: number }
): RealNetworkTransport {
  return new RealNetworkTransport({
    ...opts,
    lanIp: ip,
    createUdpSocket: () => createVirtualUdpSocket(bus, ip)
  })
}

const hostA = virtualTransport(ipA, {
  deviceId: 'dev_sim_a',
  userId: 'user_sim_a',
  displayName: 'Sim A',
  listenPort: portA
})
const hostB = virtualTransport(ipB, {
  deviceId: 'dev_sim_b',
  userId: 'user_sim_b',
  displayName: 'Sim B',
  listenPort: portB
})

hostA.start()
hostB.start()

try {
  await new Promise((r) => setTimeout(r, DISCOVERY_INTERVAL_MS + 200))

  const peersBeforePairing = await hostB.discoverPeers()
  assert.ok(
    peersBeforePairing.some((p) => p.userId === 'user_sim_a' && p.host === ipA),
    'UDP discovery broadcast should reach peer B before pairing'
  )

  const session = hostA.startPairingSession()
  const peer = await hostB.joinWithPairingCode(session.code)
  assert.equal(peer.userId, 'user_sim_a')
  assert.equal(peer.host, ipA)
  assert.ok(peer.groups?.some((g) => g.groupId === GROUP_ID), 'pairing_found includes groups')

  const peersAfterPairing = await hostB.discoverPeers()
  assert.ok(
    peersAfterPairing.some((p) => p.userId === 'user_sim_a'),
    'discoverPeers still lists A after TCP pairing'
  )

  const cached = listCachedDiscoverGroups()
  assert.ok(
    cached.some((c) => c.advert.groupId === GROUP_ID && c.ownerUserId === 'user_sim_a'),
    'rememberPeerGroups after VirtualLan pairing'
  )

  console.log('verify:discover-sim OK')
} finally {
  hostA.stop()
  hostB.stop()
}
