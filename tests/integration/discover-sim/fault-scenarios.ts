/**
 * VirtualLan 故障注入场景（SPRINT-DISCOVER-TEST-04）。
 */
import assert from 'node:assert/strict'
import { PairingSessionHost } from '../../../src/main/network/real/pairingSession.ts'
import { PairingUdpController } from '../../../src/main/network/real/pairingUdp.ts'
import { RealNetworkTransport } from '../../../src/main/network/real/RealNetworkTransport.ts'
import { UDP_DISCOVERY_PORT } from '../../../src/shared/network/constants.ts'
import { MAX_PAIRING_LOOKUPS_PER_JOINER_PER_MINUTE } from '../../../src/shared/network/pairingTypes.ts'
import { VirtualLanBus, createVirtualUdpSocket } from '../../helpers/VirtualLan.ts'
import {
  createSimHost,
  installSimGroupProvider,
  reservePort,
  stopSimHosts
} from '../../helpers/virtualLanFixture.ts'

export async function runTcpOnlyFallbackSim(): Promise<void> {
  installSimGroupProvider()
  const bus = new VirtualLanBus()
  const hostA = await createSimHost(bus, 1, 10, {
    deviceId: 'dev_tcp_fb_a',
    userId: 'user_tcp_fb_a',
    displayName: 'TCP FB A'
  })
  const portB = await reservePort()
  const hostB = new RealNetworkTransport({
    deviceId: 'dev_tcp_fb_b',
    userId: 'user_tcp_fb_b',
    displayName: 'TCP FB B',
    listenPort: portB,
    disableUdp: true
  })

  hostA.transport.start()
  hostB.start()
  const session = hostA.transport.startPairingSession()

  try {
    await assert.rejects(hostB.joinWithPairingCode(session.code), /pairing/)

    const peer = await hostB.connectManualHostWithPairing('127.0.0.1', hostA.port, session.code)
    assert.equal(peer.userId, 'user_tcp_fb_a')
    assert.ok(peer.groups?.length, 'TCP pairing_resolve returns groups')
  } finally {
    await stopSimHosts([hostA])
    hostB.stop()
  }
}

export async function runUdpBlackholeSim(): Promise<void> {
  installSimGroupProvider()
  const bus = new VirtualLanBus({ udpDropRate: 1 })
  const hostA = await createSimHost(bus, 1, 10, {
    deviceId: 'dev_drop_a',
    userId: 'user_drop_a',
    displayName: 'Drop A'
  })
  const ipA = hostA.ip
  const ipB = '10.0.1.11'

  const serverSocket = createVirtualUdpSocket(bus, ipA)
  const clientSocket = createVirtualUdpSocket(bus, ipB)

  await new Promise<void>((resolve) => serverSocket.bind(UDP_DISCOVERY_PORT, () => resolve()))
  await new Promise<void>((resolve) => clientSocket.bind(0, () => resolve()))

  const pairingHost = new PairingSessionHost({
    deviceId: 'dev_drop_a',
    userId: 'user_drop_a',
    displayName: 'Drop A',
    listenPort: hostA.port,
    getGroups: () => [{ groupId: 'discover-sim-group', name: '仿真发现群', type: 'project' }],
    getHost: () => ipA
  })
  const session = pairingHost.start()

  const hostCtrl = new PairingUdpController(
    () => serverSocket,
    true,
    pairingHost,
    { deviceId: 'dev_drop_a', displayName: 'Drop A' }
  )
  const joinerCtrl = new PairingUdpController(
    () => clientSocket,
    true,
    null,
    { deviceId: 'dev_drop_b', displayName: 'Drop B' }
  )

  serverSocket.on('message', (buf, rinfo) => {
    hostCtrl.handleMessage(buf, rinfo)
  })
  clientSocket.on('message', (buf, rinfo) => {
    joinerCtrl.handleMessage(buf, rinfo)
  })

  try {
    await assert.rejects(
      joinerCtrl.lookupPairingCode(session.code, { unicastHost: ipA, timeoutMs: 300 }),
      /pairing_lookup_timeout/
    )
  } finally {
    hostCtrl.stopOfferBroadcast()
    joinerCtrl.cancelPendingLookup()
    serverSocket.close()
    clientSocket.close()
    hostA.transport.stop()
  }
}

export async function runPairingRateLimitSim(): Promise<void> {
  installSimGroupProvider()
  const bus = new VirtualLanBus()
  const hostA = await createSimHost(bus, 1, 10, {
    deviceId: 'dev_rl_a',
    userId: 'user_rl_a',
    displayName: 'RL A'
  })
  const hostB = await createSimHost(bus, 1, 11, {
    deviceId: 'dev_rl_b',
    userId: 'user_rl_b',
    displayName: 'RL B'
  })

  hostA.transport.start()
  hostB.transport.start()
  hostA.transport.startPairingSession()

  try {
    for (let i = 0; i < MAX_PAIRING_LOOKUPS_PER_JOINER_PER_MINUTE; i++) {
      await assert.rejects(
        hostB.transport.connectManualHostWithPairing('127.0.0.1', hostA.port, '000000'),
        /pairing_resolve/
      )
    }
    await assert.rejects(
      hostB.transport.connectManualHostWithPairing('127.0.0.1', hostA.port, '000000'),
      /rate_limit|pairing_resolve/
    )
  } finally {
    await stopSimHosts([hostA, hostB])
  }
}
