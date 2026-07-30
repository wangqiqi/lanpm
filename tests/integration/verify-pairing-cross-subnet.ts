/**
 * 跨网段配对：IP 尾段展开 + TCP pairing_resolve 兜底。
 * Run: npm run verify:pairing-cross-subnet
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { setDiscoverableGroupsProvider } from '../../src/main/discover/advertProvider.ts'
import { buildPairingHostCandidates } from '../../src/shared/network/pairingHostResolve.ts'
import { RealNetworkTransport } from '../../src/main/network/real/RealNetworkTransport.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const pairingServiceSrc = readFileSync(
  join(projectRoot, 'src/main/discover/pairingService.ts'),
  'utf8'
)
assert.match(pairingServiceSrc, /buildPairingHostCandidates/)
assert.match(pairingServiceSrc, /listSubnetBroadcastAddresses/)

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
  { groupId: 'cross-subnet-group', name: '跨网段群', type: 'project' }
])

const candidates = buildPairingHostCandidates('1', {
  localLanIps: ['127.0.0.1'],
  seedHosts: ['192.168.20.109']
})
assert.deepEqual(candidates, ['127.0.0.1', '192.168.20.1'])

const portA = await reservePort()
const portB = await reservePort()

const hostA = new RealNetworkTransport({
  deviceId: 'dev_cross_host',
  userId: 'user_cross_host',
  displayName: 'Cross Host',
  listenPort: portA,
  disableUdp: true
})
const hostB = new RealNetworkTransport({
  deviceId: 'dev_cross_joiner',
  userId: 'user_cross_joiner',
  displayName: 'Cross Joiner',
  listenPort: portB,
  disableUdp: true
})

hostA.start()
hostB.start()

const session = hostA.startPairingSession()

try {
  let connected = false
  for (const target of candidates) {
    try {
      const peer = await hostB.connectManualHostWithPairing(target, portA, session.code)
      assert.equal(peer.userId, 'user_cross_host')
      connected = true
      break
    } catch {
      // try next candidate
    }
  }
  assert.ok(connected, 'should connect via tail-expanded host 127.0.0.1')

  console.log('verify:pairing-cross-subnet OK')
} finally {
  hostA.stop()
  hostB.stop()
}
