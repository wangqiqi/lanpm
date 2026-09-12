import type { DiscoveryPayload } from '../network/types'

/**
 * 同一 LAN IP 上多次 Setup 会产生多个 userId；发现「成员」只保留一台（优先已握手链路）。
 * 不处理无 host 的 peer（loopback 单测仍可多节点）。
 */
export function collapseDiscoveredPeersOnePerHost(
  peers: DiscoveryPayload[],
  isPreferredDevice: (deviceId: string) => boolean
): DiscoveryPayload[] {
  const byHost = new Map<string, DiscoveryPayload[]>()
  const noHost: DiscoveryPayload[] = []

  for (const peer of peers) {
    const host = peer.host?.trim()
    if (!host || host === '127.0.0.1' || host === '::1') {
      noHost.push(peer)
      continue
    }
    const bucket = byHost.get(host)
    if (bucket) bucket.push(peer)
    else byHost.set(host, [peer])
  }

  const picked: DiscoveryPayload[] = [...noHost]
  for (const group of byHost.values()) {
    if (group.length === 1) {
      picked.push(group[0])
      continue
    }
    const preferred = group.filter((p) => isPreferredDevice(p.deviceId))
    picked.push(preferred[0] ?? group[0])
  }
  return picked
}
