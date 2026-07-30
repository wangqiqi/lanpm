/**
 * UDP pairing_offer / pairing_lookup / pairing_found 同机回环。
 * Run: npm run verify:pairing-udp
 */
import assert from 'node:assert/strict'
import dgram from 'node:dgram'
import { setDiscoverableGroupsProvider } from '../../src/main/discover/advertProvider.ts'
import { PairingSessionHost } from '../../src/main/network/real/pairingSession.ts'
import { PairingUdpController } from '../../src/main/network/real/pairingUdp.ts'
import { UDP_DISCOVERY_PORT } from '../../src/shared/network/constants.ts'

setDiscoverableGroupsProvider(() => [
  { groupId: 'pairing-udp-group', name: '配对测试群', type: 'project' }
])

const hostIdentity = {
  deviceId: 'dev_pair_host',
  userId: 'user_host',
  displayName: 'Pair Host',
  listenPort: 43_124,
  getGroups: () => [{ groupId: 'pairing-udp-group', name: '配对测试群', type: 'project' as const }],
  getHost: () => '127.0.0.1'
}

const serverSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
const clientSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

await new Promise<void>((resolve, reject) => {
  serverSocket.once('error', reject)
  serverSocket.bind(UDP_DISCOVERY_PORT, '127.0.0.1', () => resolve())
})

await new Promise<void>((resolve, reject) => {
  clientSocket.once('error', reject)
  clientSocket.bind(0, '127.0.0.1', () => resolve())
})

const pairingHost = new PairingSessionHost(hostIdentity)
const session = pairingHost.start()

const hostCtrl = new PairingUdpController(
  () => serverSocket,
  true,
  pairingHost,
  { deviceId: hostIdentity.deviceId, displayName: hostIdentity.displayName }
)

const joinerCtrl = new PairingUdpController(
  () => clientSocket,
  true,
  null,
  { deviceId: 'dev_pair_joiner', displayName: 'Joiner' }
)

serverSocket.on('message', (buf, rinfo) => {
  hostCtrl.handleMessage(buf, rinfo)
})

clientSocket.on('message', (buf, rinfo) => {
  joinerCtrl.handleMessage(buf, rinfo)
})

try {
  const found = await joinerCtrl.lookupPairingCode(session.code, { unicastHost: '127.0.0.1' })
  assert.equal(found.userId, 'user_host')
  assert.equal(found.listenPort, 43_124)
  assert.ok(found.groups?.some((g) => g.groupId === 'pairing-udp-group'), 'offer includes groups')
  console.log('verify:pairing-udp OK')
} finally {
  hostCtrl.stopOfferBroadcast()
  joinerCtrl.cancelPendingLookup()
  serverSocket.close()
  clientSocket.close()
}
