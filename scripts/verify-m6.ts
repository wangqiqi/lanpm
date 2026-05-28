/**
 * M6 crypto + encrypted P2P loopback smoke.
 * Run: npm run verify:m6
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { SyncEnvelope } from '../src/shared/network/types.ts'
import {
  UDP_DISCOVERY_PORT,
  PEER_TTL_MS,
  RECONNECT_BACKOFF_MS
} from '../src/shared/network/constants.ts'
import { deriveAesKey, deriveSharedSecret, generateDhKeyPair } from '../src/main/crypto/dhSession.ts'
import { openEnvelope, sealEnvelope } from '../src/main/crypto/envelopeCrypto.ts'
import { RealNetworkTransport } from '../src/main/network/real/RealNetworkTransport.ts'

assert.equal(UDP_DISCOVERY_PORT, 43123)
assert.equal(PEER_TTL_MS, 15_000)
assert.ok(RECONNECT_BACKOFF_MS.includes(20_000))

const aKeys = generateDhKeyPair()
const bKeys = generateDhKeyPair()
const secretA = deriveSharedSecret(aKeys.privateKey, bKeys.publicKey)
const secretB = deriveSharedSecret(bKeys.privateKey, aKeys.publicKey)
assert.equal(secretA.toString('hex'), secretB.toString('hex'))
const aes = deriveAesKey(secretA)

const env: SyncEnvelope = {
  version: 1,
  type: 'chat',
  msgId: `msg_${randomUUID()}`,
  senderUserId: 'u1',
  senderDeviceId: 'd1',
  groupId: 'g-test',
  ts: new Date().toISOString(),
  payload: { text: 'encrypted hello' },
  nonce: '',
  authTag: ''
}
const sealed = sealEnvelope(aes, env)
const opened = openEnvelope(aes, sealed)
assert.deepEqual(opened.payload, env.payload)

const GROUP = 'm6-loopback'
const portA = 43_180
const portB = 43_181

const a = new RealNetworkTransport({
  deviceId: 'dev_m6_a',
  userId: 'user_a',
  displayName: 'A',
  listenPort: portA,
  disableUdp: true
})
const b = new RealNetworkTransport({
  deviceId: 'dev_m6_b',
  userId: 'user_b',
  displayName: 'B',
  listenPort: portB,
  disableUdp: true
})

a.start()
b.start()

try {
  const received: SyncEnvelope[] = []
  const unsub = b.subscribe(GROUP, (e) => received.push(e))

  await a.connectPeer({
    deviceId: 'dev_m6_b',
    userId: 'user_b',
    displayName: 'B',
    listenPort: portB,
    capabilities: ['chat'],
    host: '127.0.0.1'
  })

  await new Promise((r) => setTimeout(r, 300))

  await a.publish({
    version: 1,
    type: 'chat',
    msgId: `msg_${randomUUID()}`,
    senderUserId: 'user_a',
    senderDeviceId: 'dev_m6_a',
    groupId: GROUP,
    ts: new Date().toISOString(),
    payload: { text: 'lan p2p' },
    nonce: '',
    authTag: ''
  })

  await new Promise((r) => setTimeout(r, 400))
  assert.equal(received.length, 1)
  assert.equal((received[0]?.payload as { text?: string }).text, 'lan p2p')
  assert.ok(received[0]?.nonce && received[0]?.authTag)

  unsub()
} finally {
  a.stop()
  b.stop()
}

console.log('verify-m6: ok')
