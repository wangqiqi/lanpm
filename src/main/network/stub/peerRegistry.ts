import { readdirSync, readFileSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'
import type { DiscoveryPayload } from '../../../shared/network'
import { PEER_TTL_MS } from '../../../shared/network/constants.ts'
import { STUB_PEERS_DIR } from './constants.ts'
import { refreshLanUserIds } from '../peerDirectory.ts'

export function readPeerRecords(excludeDeviceId?: string): DiscoveryPayload[] {
  let names: string[] = []
  try {
    names = readdirSync(STUB_PEERS_DIR)
  } catch {
    return []
  }

  const now = Date.now()
  const peers: DiscoveryPayload[] = []

  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const filePath = join(STUB_PEERS_DIR, name)
    try {
      const st = statSync(filePath)
      if (now - st.mtimeMs > PEER_TTL_MS) {
        unlinkSync(filePath)
        continue
      }
      const raw = readFileSync(filePath, 'utf8')
      const payload = JSON.parse(raw) as DiscoveryPayload
      if (excludeDeviceId && payload.deviceId === excludeDeviceId) continue
      peers.push(payload)
    } catch {
      // stale or corrupt peer file
    }
  }

  refreshLanUserIds(peers)
  return peers
}

export { getKnownLanUserIds, refreshLanUserIds } from '../peerDirectory.ts'
