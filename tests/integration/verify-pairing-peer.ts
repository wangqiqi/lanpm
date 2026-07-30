/**
 * U 盘配对文件 lanpm-peer.json（TASK-PAIR-21/24）。
 * Run: npm run verify:pairing-peer
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createServer } from 'node:net'
import { fileURLToPath } from 'url'
import { setDiscoverableGroupsProvider } from '../../src/main/discover/advertProvider.ts'
import { buildLanpmPeerFile, parseLanpmPeerFileJson } from '../../src/shared/network/peerFile.ts'
import { RealNetworkTransport } from '../../src/main/network/real/RealNetworkTransport.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const peerFileServiceSrc = readFileSync(
  join(projectRoot, 'src/main/discover/peerFileService.ts'),
  'utf8'
)
const pairingIpcSrc = readFileSync(join(projectRoot, 'src/main/ipc/pairing.ts'), 'utf8')

assert.match(peerFileServiceSrc, /buildLocalPeerFile/)
assert.match(peerFileServiceSrc, /importPeerFile/)
assert.match(pairingIpcSrc, /importPeerFileDialog/)
assert.match(pairingIpcSrc, /exportPeerFileDialog/)

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
  { groupId: 'peer-file-group', name: '配对文件群', type: 'project' }
])

const portA = await reservePort()
const portB = await reservePort()

const hostA = new RealNetworkTransport({
  deviceId: 'dev_peer_host',
  userId: 'user_peer_host',
  displayName: 'Peer Host',
  listenPort: portA,
  disableUdp: true
})
const hostB = new RealNetworkTransport({
  deviceId: 'dev_peer_joiner',
  userId: 'user_peer_joiner',
  displayName: 'Peer Joiner',
  listenPort: portB,
  disableUdp: true
})

hostA.start()
hostB.start()

const peerFile = buildLanpmPeerFile({
  host: '127.0.0.1',
  port: portA,
  deviceId: 'dev_peer_host',
  displayName: 'Peer Host'
})

const serialized = JSON.stringify(peerFile)
const parsed = parseLanpmPeerFileJson(serialized)
assert.equal(parsed.host, '127.0.0.1')
assert.equal(parsed.port, portA)

try {
  await hostB.connectManualHost(parsed.host, parsed.port)
  await new Promise((r) => setTimeout(r, 400))
  const peers = await hostB.discoverPeers()
  const found = peers.find((p) => p.userId === 'user_peer_host')
  assert.ok(found, 'peer file host:port should establish TCP peer')
  console.log('verify:pairing-peer OK')
} finally {
  hostA.stop()
  hostB.stop()
}
