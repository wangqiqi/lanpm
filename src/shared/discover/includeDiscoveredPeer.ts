/** Probe identities must not appear in Discover people. */
export const DISCOVER_PROBE_USER_ID = '__lanpm_probe__'

/** Include LAN peers in Discover snapshot. Keep other devices of the same user (dual-machine). */
export function includeDiscoveredPeer(
  peer: { userId?: string; deviceId?: string },
  local: { deviceId?: string }
): boolean {
  if (!peer.userId || peer.userId === DISCOVER_PROBE_USER_ID) return false
  if (local.deviceId && peer.deviceId && peer.deviceId === local.deviceId) return false
  return true
}
