import type { Database } from 'better-sqlite3'
import { readFileSync, writeFileSync } from 'node:fs'
import type { DiscoverSnapshot } from '../../shared/discover/types'
import {
  buildLanpmPeerFile,
  parseLanpmPeerFileJson,
  serializeLanpmPeerFile,
  type LanpmPeerFileV1
} from '../../shared/network/peerFile.ts'
import { getSetupStatus } from '../identity/setup'
import { pinPeerPublicKey } from '../crypto/peerTrustStore.ts'
import { getNetworkTransport, RealNetworkTransport } from '../network'
import { getLocalLanIp } from '../network/localIp'
import {
  addDiscoverSeed,
  DISCOVER_SEEDS_META_KEY,
  normalizeDiscoverSeeds
} from '../../shared/discover/discoverSeeds'
import { getMeta } from '../storage/repositories/syncMetaRepository'
import { fetchDiscoverSnapshot, setDiscoverSeeds } from './discoverService'
import { connectManualPeer } from '../network/index.ts'

function requireRealTransport(): RealNetworkTransport {
  const transport = getNetworkTransport()
  if (!(transport instanceof RealNetworkTransport)) {
    throw new Error('manual_peer_unsupported')
  }
  return transport
}

export function buildLocalPeerFile(db: Database): LanpmPeerFileV1 {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    throw new Error('identity_not_configured')
  }
  const transport = requireRealTransport()
  const host = getLocalLanIp() ?? '127.0.0.1'
  return buildLanpmPeerFile({
    host,
    port: transport.getListenPort(),
    deviceId: status.device.deviceId,
    displayName: status.user.displayName,
    publicKeyHex: transport.getLocalPublicKeyHex()
  })
}

export function writePeerFile(path: string, file: LanpmPeerFileV1): void {
  writeFileSync(path, serializeLanpmPeerFile(file), 'utf8')
}

export function readPeerFile(path: string): LanpmPeerFileV1 {
  return parseLanpmPeerFileJson(readFileSync(path, 'utf8'))
}

export async function importPeerFile(
  db: Database,
  file: LanpmPeerFileV1
): Promise<{ file: LanpmPeerFileV1; snapshot: DiscoverSnapshot }> {
  if (file.publicKeyHex) {
    pinPeerPublicKey(file.deviceId, file.publicKeyHex, 'peer_file')
  }
  await connectManualPeer(file.host, file.port)
  const seedAddress = `${file.host}:${file.port}`
  const current = normalizeDiscoverSeeds(getMeta(db, DISCOVER_SEEDS_META_KEY))
  setDiscoverSeeds(db, addDiscoverSeed(current, seedAddress))
  const snapshot = await fetchDiscoverSnapshot(db, { connectSeeds: true })
  return { file, snapshot }
}

export async function importPeerFileFromPath(
  db: Database,
  path: string
): Promise<{ file: LanpmPeerFileV1; snapshot: DiscoverSnapshot }> {
  return importPeerFile(db, readPeerFile(path))
}
