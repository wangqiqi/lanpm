import type { Database } from 'better-sqlite3'
import { throwLanpm } from '../../shared/errors/lanpmError'
import type {
  PairingJoinInput,
  PairingJoinResult,
  PairingSessionView
} from '../../shared/discover/pairing'
import {
  addDiscoverSeed,
  DISCOVER_SEEDS_META_KEY,
  normalizeDiscoverSeeds
} from '../../shared/discover/discoverSeeds'
import { DEFAULT_TCP_LISTEN_PORT } from '../../shared/network/constants.ts'
import { parseHostPort } from '../../shared/network/manualPeer'
import {
  buildPairingHostCandidates,
  hostTail
} from '../../shared/network/pairingHostResolve.ts'
import {
  listRouteGuidedBroadcastAddresses,
  listRouteGuidedSubnetPrefixes
} from '../../shared/network/routeGuidedResolve.ts'
import { listSubnetScanHosts } from '../../shared/network/subnetScanHosts.ts'
import { getNetworkTransport, RealNetworkTransport } from '../network'
import { getLocalLanIp, listLanCandidates } from '../network/localIp'
import { listRouteSubnetPrefixes } from '../network/routeTable.ts'
import { fetchDiscoverSnapshot, setDiscoverSeeds } from './discoverService'
import { getMeta } from '../storage/repositories/syncMetaRepository'

function requireRealTransport(): RealNetworkTransport {
  const transport = getNetworkTransport()
  if (!(transport instanceof RealNetworkTransport)) {
    throwLanpm('err.manualPeerUnsupported')
  }
  return transport
}

export function startPairingSession(): PairingSessionView {
  const view = requireRealTransport().startPairingSession()
  const localIp = getLocalLanIp() ?? undefined
  return {
    ...view,
    localIp,
    localIpTail: localIp ? (hostTail(localIp) ?? undefined) : undefined
  }
}

export function cancelPairingSession(): void {
  const transport = getNetworkTransport()
  if (transport instanceof RealNetworkTransport) {
    transport.cancelPairingSession()
  }
}

function pairingHostContext(db: Database): { localLanIps: string[]; seedHosts: string[] } {
  const seeds = normalizeDiscoverSeeds(getMeta(db, DISCOVER_SEEDS_META_KEY))
  return {
    localLanIps: listLanCandidates()
      .filter((c) => c.score > 0)
      .map((c) => c.address),
    seedHosts: seeds.map((s) => parseHostPort(s).host)
  }
}

type PairingJoinTarget = {
  unicastHost?: string
  unicastHosts?: string[]
  port?: number
  subnetScanBatch?: boolean
}

async function resolveJoinTargets(
  db: Database,
  input: PairingJoinInput
): Promise<PairingJoinTarget[]> {
  const ctx = pairingHostContext(db)

  if (!input.crossSubnet) {
    return [{}]
  }

  const routePrefixes = await listRouteSubnetPrefixes()

  const trimmed = input.unicastHost?.trim()
  if (trimmed) {
    if (trimmed.includes(':')) {
      const { host, port } = parseHostPort(trimmed)
      return [{ unicastHost: host, port: port ?? input.port ?? DEFAULT_TCP_LISTEN_PORT }]
    }
    const hosts = buildPairingHostCandidates(trimmed, {
      ...ctx,
      routeSubnetPrefixes: routePrefixes
    })
    const port = input.port ?? DEFAULT_TCP_LISTEN_PORT
    return hosts.map((unicastHost) => ({ unicastHost, port }))
  }
  const routeCtx = {
    routeSubnetPrefixes: routePrefixes,
    localLanIps: ctx.localLanIps,
    seedHosts: ctx.seedHosts
  }
  const broadcasts = listRouteGuidedBroadcastAddresses(routeCtx)
  const port = input.port ?? DEFAULT_TCP_LISTEN_PORT
  const targets: PairingJoinTarget[] = []

  if (broadcasts.length > 1) {
    targets.push({ unicastHosts: broadcasts, port })
  } else if (broadcasts.length === 1) {
    targets.push({ unicastHost: broadcasts[0], port })
  } else {
    targets.push({})
  }

  if (input.subnetScan) {
    const prefixes = listRouteGuidedSubnetPrefixes(routeCtx)
    const scanHosts = listSubnetScanHosts(prefixes, { excludeHosts: ctx.localLanIps })
    if (scanHosts.length > 0) {
      targets.push({ unicastHosts: scanHosts, port, subnetScanBatch: true })
    }
  }

  return targets
}

export async function joinWithPairingCode(
  db: Database,
  input: PairingJoinInput
): Promise<PairingJoinResult> {
  const code = input.code?.trim()
  if (!code) {
    throw new Error('pairing_code_required')
  }

  const transport = requireRealTransport()
  const targets = await resolveJoinTargets(db, input)
  let lastError: unknown

  for (const target of targets) {
    try {
      const peer = await transport.joinWithPairingCode(code, target)
      const seedAddress = `${peer.host}:${peer.listenPort}`
      const current = normalizeDiscoverSeeds(getMeta(db, DISCOVER_SEEDS_META_KEY))
      setDiscoverSeeds(db, addDiscoverSeed(current, seedAddress))

      return {
        deviceId: peer.deviceId,
        userId: peer.userId,
        displayName: peer.displayName,
        host: peer.host ?? target.unicastHost ?? '127.0.0.1',
        listenPort: peer.listenPort,
        groupIds: peer.groups?.map((g) => g.groupId) ?? []
      }
    } catch (err) {
      lastError = err
    }
  }

  if (lastError instanceof Error) throw lastError
  throw new Error('pairing_lookup_failed')
}

export async function joinWithPairingCodeAndSnapshot(
  db: Database,
  input: PairingJoinInput
): Promise<{ join: PairingJoinResult; snapshot: Awaited<ReturnType<typeof fetchDiscoverSnapshot>> }> {
  const join = await joinWithPairingCode(db, input)
  const snapshot = await fetchDiscoverSnapshot(db, { connectSeeds: true })
  return { join, snapshot }
}
