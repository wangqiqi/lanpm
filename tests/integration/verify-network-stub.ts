/**
 * M0-09 / M0-10 NetworkStub self-test (in-process dual stub; no LANPM_NETWORK needed).
 * Run: npm run verify:network-stub
 */
import { randomUUID } from 'crypto'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import { NetworkStub } from '../../src/main/network/stub/NetworkStub.ts'

const GROUP = 'stub-self-test'

function makeEnvelope(
  deviceId: string,
  userId: string,
  body: string,
  msgId?: string
): SyncEnvelope {
  return {
    version: 1,
    type: 'chat',
    msgId: msgId ?? `msg_${randomUUID()}`,
    senderUserId: userId,
    senderDeviceId: deviceId,
    groupId: GROUP,
    ts: new Date().toISOString(),
    payload: { text: body },
    nonce: '',
    authTag: ''
  }
}

async function runNetworkStubSelfTest(): Promise<void> {
  const a = new NetworkStub({
    deviceId: 'dev_test_a',
    userId: 'user_a',
    displayName: 'User A'
  })
  const b = new NetworkStub({
    deviceId: 'dev_test_b',
    userId: 'user_b',
    displayName: 'User B'
  })

  a.start()
  b.start()

  try {
    const received: SyncEnvelope[] = []
    const unsub = b.subscribe(GROUP, (env) => received.push(env))

    await a.publish(makeEnvelope('dev_test_a', 'user_a', 'hello'))
    await new Promise((r) => setTimeout(r, 500))

    if (received.length !== 1) {
      throw new Error(`expected 1 message on B, got ${received.length}`)
    }
    const text = (received[0]?.payload as { text?: string } | undefined)?.text
    if (text !== 'hello') {
      throw new Error('payload mismatch')
    }

    const peersA = await a.discoverPeers()
    if (!peersA.some((p) => p.deviceId === 'dev_test_b')) {
      throw new Error('A did not discover B')
    }

    const dupId = `msg_dup_${randomUUID()}`
    await a.publish(makeEnvelope('dev_test_a', 'user_a', 'dup1', dupId))
    await a.publish(makeEnvelope('dev_test_a', 'user_a', 'dup2', dupId))
    await new Promise((r) => setTimeout(r, 500))

    const dupCount = received.filter((m) => m.msgId === dupId).length
    if (dupCount !== 1) {
      throw new Error(`dedup failed: ${dupCount} deliveries for same msgId`)
    }

    const lamportSeen: number[] = []
    const unsubOrder = b.subscribe(GROUP, (env) => {
      if (env.lamportTs !== undefined) lamportSeen.push(env.lamportTs)
    })
    await a.publish(makeEnvelope('dev_test_a', 'user_a', 'o1'))
    await a.publish(makeEnvelope('dev_test_a', 'user_a', 'o2'))
    await new Promise((r) => setTimeout(r, 500))
    unsubOrder()

    const orderSlice = lamportSeen.slice(-2)
    if (orderSlice.length === 2 && orderSlice[1]! < orderSlice[0]!) {
      throw new Error('lamport ordering violated')
    }

    unsub()
  } finally {
    a.stop()
    b.stop()
  }
}

await runNetworkStubSelfTest()
console.log('OK: NetworkStub publish/subscribe/discoverPeers + dedup/lamport')
