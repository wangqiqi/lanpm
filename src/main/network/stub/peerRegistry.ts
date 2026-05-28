import { readdirSync, readFileSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'
import type { DiscoveryPayload } from '../../../shared/network'
import { STUB_PEER_TTL_MS, STUB_PEERS_DIR } from './constants.ts'

const lanUserIds = new Set<string>()

export function getKnownLanUserIds(): Set<string> {
  return lanUserIds
}

export function refreshLanUserIds(peers: DiscoveryPayload[]): void {
  lanUserIds.clear()
  for (const p of peers) {
    if (p.userId) lanUserIds.add(p.userId)
  }
}

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
      if (now - st.mtimeMs > STUB_PEER_TTL_MS) {
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

  return peers
}
