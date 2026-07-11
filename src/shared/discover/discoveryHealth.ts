/** A5 · discovery failure / empty-state reason codes (map to i18n in UI). */
export type DiscoveryReasonCode =
  | 'ok'
  | 'empty'
  | 'bind_failed'
  | 'multicast_degraded'
  | 'broadcast_failed'
  | 'transport_offline'
  | 'udp_disabled'
  | 'stub_mode'

export interface DiscoveryHealthInput {
  mode: 'stub' | 'real'
  /** UDP bind succeeded (real mode). */
  bindOk: boolean
  /** Multicast membership ok; null = disabled via env. */
  multicastOk: boolean | null
  /** Last broadcast/send error message, if any. */
  lastBroadcastError?: string | null
  /** UDP discovery intentionally off (LANPM_DISABLE_UDP / test). */
  udpDisabled?: boolean
  peerCount: number
  groupCount: number
}

export interface DiscoveryHealth {
  reason: DiscoveryReasonCode
  /** Transport is usable enough to keep listening / manual peer. */
  ok: boolean
  suggestManualPeer: boolean
}

/**
 * Derive UX health from transport signals + discovered counts.
 * Priority: bind fail → udp off → broadcast fail → offline empty → multicast soft → empty → ok.
 */
export function evaluateDiscoveryHealth(input: DiscoveryHealthInput): DiscoveryHealth {
  if (input.mode === 'stub') {
    const empty = input.peerCount === 0 && input.groupCount === 0
    return {
      reason: empty ? 'stub_mode' : 'ok',
      ok: true,
      suggestManualPeer: empty
    }
  }

  if (input.udpDisabled) {
    return { reason: 'udp_disabled', ok: false, suggestManualPeer: true }
  }

  if (!input.bindOk) {
    return { reason: 'bind_failed', ok: false, suggestManualPeer: true }
  }

  if (input.lastBroadcastError) {
    return { reason: 'broadcast_failed', ok: false, suggestManualPeer: true }
  }

  const empty = input.peerCount === 0 && input.groupCount === 0
  if (empty) {
    return { reason: 'transport_offline', ok: true, suggestManualPeer: true }
  }

  if (input.multicastOk === false) {
    return { reason: 'multicast_degraded', ok: true, suggestManualPeer: false }
  }

  return { reason: 'ok', ok: true, suggestManualPeer: false }
}

/** Empty list with healthy bind → suggest manual peer (VPN / cross-subnet). */
export function shouldSuggestManualPeer(health: DiscoveryHealth): boolean {
  return health.suggestManualPeer
}
