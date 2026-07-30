/**
 * VirtualLan 发现/配对仿真场景（SPRINT-DISCOVER-TEST-03）。
 */
import assert from 'node:assert/strict'
import { setDiscoverableGroupsProvider } from '../../../src/main/discover/advertProvider.ts'
import { listCachedDiscoverGroups } from '../../../src/main/discover/discoverGroupRegistry.ts'
import { DISCOVERY_INTERVAL_MS } from '../../../src/shared/network/constants.ts'
import { buildPairingHostCandidates } from '../../../src/shared/network/pairingHostResolve.ts'
import { buildLanpmPeerFile } from '../../../src/shared/network/peerFile.ts'
import { listSubnetScanHosts } from '../../../src/shared/network/subnetScanHosts.ts'
import { VirtualLanBus } from '../../helpers/VirtualLan.ts'
import {
  SIM_GROUP_ID,
  createSimHost,
  installSimGroupProvider,
  stopSimHosts
} from '../../helpers/virtualLanFixture.ts'

export async function runBasicTwoNodeSim(): Promise<void> {
  installSimGroupProvider()
  const bus = new VirtualLanBus()
  const hostA = await createSimHost(bus, 1, 10, {
    deviceId: 'dev_sim_a',
    userId: 'user_sim_a',
    displayName: 'Sim A'
  })
  const hostB = await createSimHost(bus, 1, 11, {
    deviceId: 'dev_sim_b',
    userId: 'user_sim_b',
    displayName: 'Sim B'
  })

  hostA.transport.start()
  hostB.transport.start()

  try {
    await new Promise((r) => setTimeout(r, DISCOVERY_INTERVAL_MS + 200))

    const peersBefore = await hostB.transport.discoverPeers()
    assert.ok(
      peersBefore.some((p) => p.userId === 'user_sim_a' && p.host === hostA.ip),
      'UDP discovery broadcast before pairing'
    )

    const session = hostA.transport.startPairingSession()
    const peer = await hostB.transport.joinWithPairingCode(session.code)
    assert.equal(peer.userId, 'user_sim_a')
    assert.equal(peer.host, hostA.ip)

    const cached = listCachedDiscoverGroups()
    assert.ok(
      cached.some((c) => c.advert.groupId === SIM_GROUP_ID && c.ownerUserId === 'user_sim_a'),
      'rememberPeerGroups after pairing'
    )
  } finally {
    await stopSimHosts([hostA, hostB])
  }
}

export async function runThreeNodeRelaySim(): Promise<void> {
  installSimGroupProvider()
  const bus = new VirtualLanBus()
  const hostA = await createSimHost(bus, 1, 10, {
    deviceId: 'dev_relay_a',
    userId: 'user_a',
    displayName: 'Relay A'
  })
  const hostB = await createSimHost(bus, 1, 11, {
    deviceId: 'dev_relay_b',
    userId: 'user_b',
    displayName: 'Relay B'
  })
  const hostC = await createSimHost(bus, 2, 10, {
    deviceId: 'dev_relay_c',
    userId: 'user_c',
    displayName: 'Relay C'
  })

  for (const h of [hostA, hostB, hostC]) h.transport.start()

  try {
    await hostB.transport.connectManualHost('127.0.0.1', hostA.port)
    await new Promise((r) => setTimeout(r, 500))

    const cachedB = listCachedDiscoverGroups()
    assert.ok(
      cachedB.some((c) => c.advert.groupId === SIM_GROUP_ID && c.ownerUserId === 'user_a'),
      'B caches A group after TCP'
    )

    await hostC.transport.connectManualHost('127.0.0.1', hostB.port)
    await new Promise((r) => setTimeout(r, 500))

    const cachedC = listCachedDiscoverGroups()
    assert.ok(
      cachedC.some((c) => c.advert.groupId === SIM_GROUP_ID && c.ownerUserId === 'user_a'),
      'C receives A group via relay hop≤2'
    )

    const peersC = await hostC.transport.discoverPeers()
    assert.ok(peersC.some((p) => p.userId === 'user_a'), 'C relay peers include A')
  } finally {
    await stopSimHosts([hostA, hostB, hostC])
  }
}

export async function runCrossSubnetRouteGuidedSim(): Promise<void> {
  installSimGroupProvider()
  const bus = new VirtualLanBus()
  const hostA = await createSimHost(bus, 1, 10, {
    deviceId: 'dev_route_a',
    userId: 'user_route_a',
    displayName: 'Route A'
  })
  const hostB = await createSimHost(bus, 2, 11, {
    deviceId: 'dev_route_b',
    userId: 'user_route_b',
    displayName: 'Route B'
  })

  hostA.transport.start()
  hostB.transport.start()
  const session = hostA.transport.startPairingSession()

  try {
    const peer = await hostB.transport.joinWithPairingCode(session.code, {
      unicastHosts: ['10.0.1.255', '10.0.2.255']
    })
    assert.equal(peer.userId, 'user_route_a')
    assert.equal(peer.host, hostA.ip)
  } finally {
    await stopSimHosts([hostA, hostB])
  }
}

export async function runCrossSubnetTailSim(): Promise<void> {
  installSimGroupProvider()
  const bus = new VirtualLanBus()
  const hostA = await createSimHost(bus, 1, 10, {
    deviceId: 'dev_tail_a',
    userId: 'user_tail_a',
    displayName: 'Tail A'
  })
  const hostB = await createSimHost(bus, 2, 11, {
    deviceId: 'dev_tail_b',
    userId: 'user_tail_b',
    displayName: 'Tail B'
  })

  hostA.transport.start()
  hostB.transport.start()
  const session = hostA.transport.startPairingSession()

  const candidates = buildPairingHostCandidates('10', {
    localLanIps: [hostB.ip],
    seedHosts: [hostA.ip]
  })
  assert.ok(candidates.includes(hostA.ip), 'tail expands to host A IP')

  try {
    const peer = await hostB.transport.joinWithPairingCode(session.code, {
      unicastHosts: candidates,
      port: hostA.port
    })
    assert.equal(peer.userId, 'user_tail_a')
  } finally {
    await stopSimHosts([hostA, hostB])
  }
}

export async function runSubnetScanSim(): Promise<void> {
  installSimGroupProvider()
  const bus = new VirtualLanBus()
  const hostA = await createSimHost(bus, 1, 10, {
    deviceId: 'dev_scan_a',
    userId: 'user_scan_a',
    displayName: 'Scan A'
  })
  const hostB = await createSimHost(bus, 2, 11, {
    deviceId: 'dev_scan_b',
    userId: 'user_scan_b',
    displayName: 'Scan B'
  })

  hostA.transport.start()
  hostB.transport.start()
  const session = hostA.transport.startPairingSession()

  const scanHosts = listSubnetScanHosts(['10.0.1'], { excludeHosts: [hostB.ip] })
  assert.ok(scanHosts.includes(hostA.ip), 'subnet scan list includes host A')

  try {
    const peer = await hostB.transport.joinWithPairingCode(session.code, {
      unicastHosts: scanHosts,
      port: hostA.port,
      subnetScanBatch: true
    })
    assert.equal(peer.userId, 'user_scan_a')
  } finally {
    await stopSimHosts([hostA, hostB])
  }
}

export async function runGroupInviteSim(): Promise<void> {
  setDiscoverableGroupsProvider(() => [
    { groupId: 'invite-sim-group', name: '邀请仿真群', type: 'project' }
  ])

  const bus = new VirtualLanBus()
  const hostA = await createSimHost(bus, 1, 10, {
    deviceId: 'dev_inv_a',
    userId: 'user_inv_a',
    displayName: 'Invite A'
  })
  const hostB = await createSimHost(bus, 1, 11, {
    deviceId: 'dev_inv_b',
    userId: 'user_inv_b',
    displayName: 'Invite B'
  })

  hostA.transport.start()
  hostB.transport.start()

  const invite = hostA.transport.startGroupInviteSession(
    'invite-sim-group',
    '邀请仿真群',
    'project'
  )

  try {
    const found = await hostB.transport.joinWithGroupInviteCode(invite.code)
    assert.equal(found.groupId, 'invite-sim-group')
    assert.equal(found.ownerUserId, 'user_inv_a')
  } finally {
    await stopSimHosts([hostA, hostB])
  }
}

export async function runPeerFileSim(): Promise<void> {
  installSimGroupProvider()
  const bus = new VirtualLanBus()
  const hostA = await createSimHost(bus, 1, 10, {
    deviceId: 'dev_peer_a',
    userId: 'user_peer_a',
    displayName: 'Peer A'
  })
  const hostB = await createSimHost(bus, 1, 11, {
    deviceId: 'dev_peer_b',
    userId: 'user_peer_b',
    displayName: 'Peer B'
  })

  hostA.transport.start()
  hostB.transport.start()

  const peerFile = buildLanpmPeerFile({
    host: hostA.ip,
    port: hostA.port,
    deviceId: 'dev_peer_a',
    displayName: 'Peer A'
  })

  try {
    // 单进程仿真：配对文件写虚拟 IP，TCP 仍走 loopback
    await hostB.transport.connectManualHost('127.0.0.1', peerFile.port)
    await new Promise((r) => setTimeout(r, 300))
    const peers = await hostB.transport.discoverPeers()
    assert.ok(peers.some((p) => p.userId === 'user_peer_a'), 'peer file host connects over VirtualLan advert')
  } finally {
    await stopSimHosts([hostA, hostB])
  }
}
