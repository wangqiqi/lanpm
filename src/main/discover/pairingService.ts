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
import { getNetworkTransport, RealNetworkTransport } from '../network'
import { getLocalLanIp } from '../network/localIp'
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
  return {
    ...view,
    localIp: getLocalLanIp() ?? undefined
  }
}

export function cancelPairingSession(): void {
  const transport = getNetworkTransport()
  if (transport instanceof RealNetworkTransport) {
    transport.cancelPairingSession()
  }
}

function resolveJoinTarget(input: PairingJoinInput): { unicastHost?: string; port?: number } {
  if (!input.unicastHost?.trim()) {
    return {}
  }
  const trimmed = input.unicastHost.trim()
  if (trimmed.includes(':')) {
    const { host, port } = parseHostPort(trimmed)
    return { unicastHost: host, port }
  }
  return {
    unicastHost: trimmed,
    port: input.port ?? DEFAULT_TCP_LISTEN_PORT
  }
}

export async function joinWithPairingCode(
  db: Database,
  input: PairingJoinInput
): Promise<PairingJoinResult> {
  const code = input.code?.trim()
  if (!code) {
    throw new Error('pairing_code_required')
  }

  const target = resolveJoinTarget(input)
  const peer = await requireRealTransport().joinWithPairingCode(code, target)

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
}

export async function joinWithPairingCodeAndSnapshot(
  db: Database,
  input: PairingJoinInput
): Promise<{ join: PairingJoinResult; snapshot: Awaited<ReturnType<typeof fetchDiscoverSnapshot>> }> {
  const join = await joinWithPairingCode(db, input)
  const snapshot = await fetchDiscoverSnapshot(db, { connectSeeds: true })
  return { join, snapshot }
}
