import type { DiscoveryPayload } from '../../shared/network/types'

const lanUserIds = new Set<string>()

export function getKnownLanUserIds(): Set<string> {
  return lanUserIds
}

export function refreshLanUserIds(peers: DiscoveryPayload[]): void {
  lanUserIds.clear()
  for (const p of peers) {
    if (p.userId && p.userId !== '__lanpm_probe__') {
      lanUserIds.add(p.userId)
    }
  }
}
