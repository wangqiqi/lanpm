import type { Database } from 'better-sqlite3'
import type { DiscoverHealthView, DiscoverSnapshot } from '../../shared/discover/types'
import { evaluateDiscoveryHealth } from '../../shared/discover/discoveryHealth'
import {
  DISCOVER_SEEDS_META_KEY,
  addDiscoverSeed,
  normalizeDiscoverSeeds
} from '../../shared/discover/discoverSeeds'
import { parseDiscoverSeedsEnv } from '../../shared/discover/discoverSeedsEnv'
import { pruneSelfDiscoverSeeds } from '../../shared/discover/selfDiscoverSeed'
import { parseHostPort } from '../../shared/network/manualPeer'
import { resolveLanpmTcpPort } from '../../shared/network/listenPort'
import { listLanCandidates } from '../network/localIp'
import { getSetupStatus } from '../identity/setup'
import { listUserGroups } from '../group/groupService'
import { listGroupMembers } from '../storage/repositories/groupRepository'
import { getMeta, setMeta } from '../storage/repositories/syncMetaRepository'
import {
  connectManualPeer,
  getNetworkTransport,
  RealNetworkTransport,
  resolveNetworkMode
} from '../network'
import { getAggregatedUserPresence } from '../presence/presenceRegistry'
import { listCachedDiscoverGroups } from './discoverGroupRegistry'
import { includeDiscoveredPeer } from '../../shared/discover/includeDiscoveredPeer'
import { listPendingJoinRequestGroupIds } from '../storage/repositories/groupJoinRequestRepository'

function loadSeeds(db: Database): string[] {
  return normalizeDiscoverSeeds(getMeta(db, DISCOVER_SEEDS_META_KEY))
}

export function loadDiscoverSeeds(db: Database): string[] {
  return loadSeeds(db)
}

export function setDiscoverSeeds(db: Database, seeds: unknown): string[] {
  const next = normalizeDiscoverSeeds(seeds)
  setMeta(db, DISCOVER_SEEDS_META_KEY, JSON.stringify(next))
  return next
}

export function appendDiscoverSeeds(db: Database, addresses: string[]): string[] {
  let next = loadSeeds(db)
  for (const address of addresses) {
    next = addDiscoverSeed(next, address)
  }
  return setDiscoverSeeds(db, next)
}

function currentListenPort(): number {
  const transport = getNetworkTransport()
  if (transport instanceof RealNetworkTransport) return transport.getListenPort()
  return resolveLanpmTcpPort(process.env.LANPM_TCP_PORT)
}

function localDiscoverHosts(): string[] {
  return listLanCandidates().map((c) => c.address)
}

function pruneStoredSelfSeeds(db: Database, seeds: string[]): string[] {
  const pruned = pruneSelfDiscoverSeeds(seeds, localDiscoverHosts(), currentListenPort())
  if (pruned.length !== seeds.length || pruned.some((s, i) => s !== seeds[i])) {
    return setDiscoverSeeds(db, pruned)
  }
  return pruned
}

/** Merge `LANPM_DISCOVER_SEEDS` into SQLite meta before auto-connect. */
export function mergeDiscoverSeedsFromEnv(db: Database): string[] {
  const fromEnv = parseDiscoverSeedsEnv(process.env.LANPM_DISCOVER_SEEDS)
  let next = loadSeeds(db)
  for (const address of fromEnv) {
    next = addDiscoverSeed(next, address)
  }
  return pruneStoredSelfSeeds(db, next)
}

const SEED_CACHE_WAIT_MS = 2_500
const SEED_CACHE_POLL_MS = 100

async function waitForDiscoverGroups(minCount: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (listCachedDiscoverGroups().length >= minCount) return
    await new Promise((resolve) => setTimeout(resolve, SEED_CACHE_POLL_MS))
  }
}

async function tryConnectSeeds(
  seeds: string[],
  options?: { waitForGroups?: boolean }
): Promise<void> {
  const connectable = pruneSelfDiscoverSeeds(seeds, localDiscoverHosts(), currentListenPort())
  for (const address of connectable) {
    try {
      const { host, port } = parseHostPort(address)
      await connectManualPeer(host, port)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[lanpm] discover seed connect failed:', address, msg)
    }
  }
  if (options?.waitForGroups && connectable.length > 0) {
    await waitForDiscoverGroups(1, SEED_CACHE_WAIT_MS)
  }
}

/** 网络就绪后自动连接已保存的发现种子（跨子网 / VPN） */
export async function connectDiscoverSeeds(
  db: Database,
  options?: { waitForGroups?: boolean }
): Promise<void> {
  const seeds = pruneStoredSelfSeeds(db, loadSeeds(db))
  if (seeds.length === 0) return
  await tryConnectSeeds(seeds, options)
}

function buildHealth(input: {
  peerCount: number
  groupCount: number
}): DiscoverHealthView {
  const mode = resolveNetworkMode()
  const transport = getNetworkTransport()

  if (mode === 'stub' || !(transport instanceof RealNetworkTransport)) {
    const evaluated = evaluateDiscoveryHealth({
      mode: mode === 'stub' ? 'stub' : 'real',
      bindOk: true,
      multicastOk: null,
      peerCount: input.peerCount,
      groupCount: input.groupCount,
      udpDisabled: mode !== 'stub' && !transport
    })
    return {
      reason: evaluated.reason,
      ok: evaluated.ok,
      suggestManualPeer: evaluated.suggestManualPeer,
      multicastOk: null
    }
  }

  const diag = transport.getDiscoveryDiagnostics()
  const evaluated = evaluateDiscoveryHealth({
    mode: 'real',
    bindOk: diag.bindOk,
    multicastOk: diag.multicastOk,
    lastBroadcastError: diag.lastBroadcastError,
    udpDisabled: diag.udpDisabled,
    peerCount: input.peerCount,
    groupCount: input.groupCount
  })
  return {
    reason: evaluated.reason,
    ok: evaluated.ok,
    suggestManualPeer: evaluated.suggestManualPeer,
    multicastOk: diag.multicastOk,
    lastError: diag.lastBroadcastError ?? undefined
  }
}

export async function fetchDiscoverSnapshot(
  db: Database,
  options?: { connectSeeds?: boolean }
): Promise<DiscoverSnapshot> {
  const status = getSetupStatus(db)
  const localUserId = status.configured && status.user ? status.user.userId : undefined
  const localDeviceId = status.configured && status.device ? status.device.deviceId : undefined
  const seeds = pruneStoredSelfSeeds(db, loadSeeds(db))

  if (options?.connectSeeds !== false && seeds.length > 0) {
    const hadGroups = listCachedDiscoverGroups().length > 0
    await tryConnectSeeds(seeds, { waitForGroups: !hadGroups })
  }

  const transport = getNetworkTransport()
  const discovered = transport ? await transport.discoverPeers() : []
  const readyLinks =
    transport instanceof RealNetworkTransport ? transport.countReadyLinks() : 0
  const liveLinks =
    transport instanceof RealNetworkTransport ? transport.countLiveLinks() : 0

  const peerMap = new Map<string, { displayName: string; devices: Set<string> }>()
  for (const peer of discovered) {
    if (!includeDiscoveredPeer(peer, { deviceId: localDeviceId })) continue
    const existing = peerMap.get(peer.userId)
    if (existing) {
      existing.devices.add(peer.deviceId)
      if (peer.displayName) existing.displayName = peer.displayName
    } else {
      peerMap.set(peer.userId, {
        displayName: peer.displayName || peer.userId,
        devices: new Set([peer.deviceId])
      })
    }
  }

  const peers = [...peerMap.entries()]
    .map(([userId, info]) => ({
      userId,
      displayName: info.displayName,
      deviceCount: info.devices.size,
      online: getAggregatedUserPresence(userId) === 'online'
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const joinedGroupIds = new Set<string>()
  for (const group of listUserGroups(db)) {
    if (localUserId && listGroupMembers(db, group.groupId).some((m) => m.userId === localUserId)) {
      joinedGroupIds.add(group.groupId)
    }
  }

  const pendingJoinGroupIds =
    localUserId != null ? listPendingJoinRequestGroupIds(db, localUserId) : new Set<string>()

  const groupMap = new Map<string, DiscoverSnapshot['groups'][number]>()
  for (const cached of listCachedDiscoverGroups()) {
    const { advert, ownerUserId, ownerDisplayName } = cached
    groupMap.set(advert.groupId, {
      groupId: advert.groupId,
      name: advert.name,
      type: advert.type,
      ownerUserId,
      ownerDisplayName,
      joined: joinedGroupIds.has(advert.groupId),
      joinPending: pendingJoinGroupIds.has(advert.groupId)
    })
  }

  const groups = [...groupMap.values()].sort((a, b) => {
    if (a.joined !== b.joined) return a.joined ? 1 : -1
    return a.name.localeCompare(b.name)
  })

  const health = buildHealth({
    peerCount: Math.max(peers.length, readyLinks, liveLinks),
    groupCount: groups.length
  })

  return { peers, groups, health, seeds }
}
