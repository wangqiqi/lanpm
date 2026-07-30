/**
 * 路由表引导单播配对（TASK-PAIR-15/17）。
 * Run: npm run verify:pairing-route
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createServer } from 'node:net'
import { fileURLToPath } from 'url'
import { setDiscoverableGroupsProvider } from '../../src/main/discover/advertProvider.ts'
import { listRouteGuidedBroadcastAddresses } from '../../src/shared/network/routeGuidedResolve.ts'
import { RealNetworkTransport } from '../../src/main/network/real/RealNetworkTransport.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const pairingServiceSrc = readFileSync(
  join(projectRoot, 'src/main/discover/pairingService.ts'),
  'utf8'
)
const pairingUdpSrc = readFileSync(
  join(projectRoot, 'src/main/network/real/pairingUdp.ts'),
  'utf8'
)

assert.match(pairingServiceSrc, /listRouteSubnetPrefixes/)
assert.match(pairingServiceSrc, /listRouteGuidedBroadcastAddresses/)
assert.match(pairingUdpSrc, /unicastHosts/)

const broadcasts = listRouteGuidedBroadcastAddresses({
  routeSubnetPrefixes: ['192.168.20', '192.168.30'],
  localLanIps: ['192.168.30.170'],
  seedHosts: []
})
assert.deepEqual(broadcasts.sort(), ['192.168.20.255', '192.168.30.255'])

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

setDiscoverableGroupsProvider(() => [
  { groupId: 'route-pair-group', name: '路由配对群', type: 'project' }
])

const portA = await reservePort()
const portB = await reservePort()

const hostA = new RealNetworkTransport({
  deviceId: 'dev_route_host',
  userId: 'user_route_host',
  displayName: 'Route Host',
  listenPort: portA,
  disableUdp: true
})
const hostB = new RealNetworkTransport({
  deviceId: 'dev_route_joiner',
  userId: 'user_route_joiner',
  displayName: 'Route Joiner',
  listenPort: portB,
  disableUdp: true
})

hostA.start()
hostB.start()

const session = hostA.startPairingSession()

try {
  const peer = await hostB.joinWithPairingCode(session.code, {
    unicastHosts: ['127.0.0.1'],
    port: portA
  })
  assert.equal(peer.userId, 'user_route_host')
  console.log('verify:pairing-route OK')
} finally {
  hostA.stop()
  hostB.stop()
}
