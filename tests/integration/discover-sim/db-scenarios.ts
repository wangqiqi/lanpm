/**
 * VirtualLan + SQLite 场景（需 Electron Node ABI）。
 * Run via: node scripts/run-electron-node.mjs --experimental-strip-types tests/integration/discover-sim/db-scenarios.ts
 */
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { join } from 'node:path'
import { setRouteSubnetPrefixOverride } from '../../../src/main/network/routeTable.ts'
import { applyMigrations } from '../../../src/main/storage/migrate.ts'
import { getMeta, setMeta } from '../../../src/main/storage/repositories/syncMetaRepository.ts'
import {
  hasPendingJoinRequest,
  insertJoinRequest
} from '../../../src/main/storage/repositories/groupJoinRequestRepository.ts'
import { insertGroup } from '../../../src/main/storage/repositories/groupRepository.ts'
import {
  DISCOVER_SEEDS_META_KEY,
  addDiscoverSeed,
  normalizeDiscoverSeeds
} from '../../../src/shared/discover/discoverSeeds.ts'
import { listRouteGuidedBroadcastAddresses } from '../../../src/shared/network/routeGuidedResolve.ts'
import { VirtualLanBus } from '../../helpers/VirtualLan.ts'
import {
  SIM_GROUP_ID,
  createSimHost,
  installSimGroupProvider,
  stopSimHosts
} from '../../helpers/virtualLanFixture.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../../lanpmTemp.ts'

export async function runPairingServiceDbSim(): Promise<void> {
  installSimGroupProvider()
  setRouteSubnetPrefixOverride(['10.0.1', '10.0.2'])

  const bus = new VirtualLanBus()
  const hostA = await createSimHost(bus, 1, 10, {
    deviceId: 'dev_svc_a',
    userId: 'user_svc_a',
    displayName: 'Svc A'
  })
  const hostB = await createSimHost(bus, 2, 11, {
    deviceId: 'dev_svc_b',
    userId: 'user_svc_b',
    displayName: 'Svc B'
  })

  const dir = mkLanpmTemp('lanpm-discover-sim-db-')
  const db = new Database(join(dir, 'test.db'))
  db.pragma('foreign_keys = ON')
  applyMigrations(db)

  hostA.transport.start()
  hostB.transport.start()
  const session = hostA.transport.startPairingSession()

  const broadcasts = listRouteGuidedBroadcastAddresses({
    routeSubnetPrefixes: ['10.0.1', '10.0.2'],
    localLanIps: [hostB.ip],
    seedHosts: []
  })

  try {
    const peer = await hostB.transport.joinWithPairingCode(session.code, {
      unicastHosts: broadcasts,
      port: hostA.port
    })
    assert.equal(peer.userId, 'user_svc_a')

    const seedAddress = `${peer.host}:${peer.listenPort}`
    const current = normalizeDiscoverSeeds(getMeta(db, DISCOVER_SEEDS_META_KEY))
    setMeta(db, DISCOVER_SEEDS_META_KEY, JSON.stringify(addDiscoverSeed(current, seedAddress)))

    const seeds = normalizeDiscoverSeeds(getMeta(db, DISCOVER_SEEDS_META_KEY))
    assert.ok(seeds.includes(seedAddress), 'discover seed persisted like pairingService.joinWithPairingCode')
  } finally {
    setRouteSubnetPrefixOverride(null)
    await stopSimHosts([hostA, hostB])
    db.close()
    rmLanpmTemp(dir)
  }
}

export async function runJoinRequestSim(): Promise<void> {
  const dir = mkLanpmTemp('lanpm-discover-sim-join-')
  const db = new Database(join(dir, 'test.db'))
  db.pragma('foreign_keys = ON')
  applyMigrations(db)

  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO users (user_id, display_name, base_name, suffix, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?)`
  ).run('user_owner', 'Owner', 'Owner', now, now)

  insertGroup(db, {
    groupId: SIM_GROUP_ID,
    type: 'project',
    name: '仿真群',
    createdBy: 'user_owner',
    createdAt: now,
    autoDiscover: true
  })

  insertJoinRequest(db, {
    requestId: 'req_sim_1',
    groupId: SIM_GROUP_ID,
    applicantUserId: 'user_applicant',
    applicantDisplayName: 'Applicant',
    ownerUserId: 'user_owner',
    status: 'pending',
    createdAt: now
  })

  try {
    assert.ok(hasPendingJoinRequest(db, SIM_GROUP_ID, 'user_applicant'), 'join request row in sim db')
  } finally {
    db.close()
    rmLanpmTemp(dir)
  }
}

await runPairingServiceDbSim()
console.log('discover-sim/db: pairing-service-db OK')
await runJoinRequestSim()
console.log('discover-sim/db: join-request OK')
