import type { DiscoverableGroupAdvert } from '../discover/types'

/** 配对码有效期（5 分钟） */
export const PAIRING_TTL_MS = 5 * 60 * 1000
/** 发起方周期广播 pairing_offer */
export const PAIRING_OFFER_INTERVAL_MS = 2_000
/** 加入方等待 pairing_found */
export type PairingResolveFailReason = 'expired' | 'mismatch' | 'rate_limit'

export const PAIRING_LOOKUP_TIMEOUT_MS = 8_000
/** TCP pairing_resolve 等待超时 */
export const PAIRING_RESOLVE_TIMEOUT_MS = 8_000
/** 单加入方对同一码的失败上限 */
export const MAX_PAIRING_FAIL_PER_JOINER = 5
/** 单加入方每分钟 lookup/resolve 次数上限（含错误码） */
export const MAX_PAIRING_LOOKUPS_PER_JOINER_PER_MINUTE = 12
export const PAIRING_LOOKUP_RATE_WINDOW_MS = 60_000

export function isPairingLookupRateLimited(
  recentTimestamps: number[],
  now: number,
  maxPerMinute: number = MAX_PAIRING_LOOKUPS_PER_JOINER_PER_MINUTE
): boolean {
  const recent = recentTimestamps.filter((t) => now - t < PAIRING_LOOKUP_RATE_WINDOW_MS)
  return recent.length >= maxPerMinute
}

export interface PairingOfferBody {
  code: string
  pairingId: string
  deviceId: string
  userId: string
  displayName: string
  listenPort: number
  host?: string
  expiresAt: string
  groups?: DiscoverableGroupAdvert[]
}

export interface PairingLookupBody {
  code: string
  joinerDeviceId: string
  joinerDisplayName: string
}

export interface PairingFoundBody {
  pairingId: string
  deviceId: string
  userId: string
  displayName: string
  listenPort: number
  host: string
  groups?: DiscoverableGroupAdvert[]
}

export type PairingUdpPacket =
  | { v: 1; kind: 'pairing_offer'; payload: PairingOfferBody }
  | { v: 1; kind: 'pairing_lookup'; payload: PairingLookupBody }
  | { v: 1; kind: 'pairing_found'; payload: PairingFoundBody }

export function formatPairingCode(code: string): string {
  const digits = normalizePairingCode(code)
  return `${digits.slice(0, 3)} ${digits.slice(3)}`
}

export function normalizePairingCode(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 0) return '000000'
  return digits.padStart(6, '0').slice(-6)
}

export function generatePairingCode(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000))
}

export function isPairingUdpPacket(raw: unknown): raw is PairingUdpPacket {
  if (!raw || typeof raw !== 'object') return false
  const p = raw as { v?: unknown; kind?: unknown }
  return (
    p.v === 1 &&
    (p.kind === 'pairing_offer' || p.kind === 'pairing_lookup' || p.kind === 'pairing_found')
  )
}

export function pairingFoundToDiscovery(
  found: PairingFoundBody,
  capabilities: string[] = ['chat', 'file', 'task']
): {
  deviceId: string
  userId: string
  displayName: string
  listenPort: number
  host: string
  capabilities: string[]
  groups?: DiscoverableGroupAdvert[]
} {
  return {
    deviceId: found.deviceId,
    userId: found.userId,
    displayName: found.displayName,
    listenPort: found.listenPort,
    host: found.host,
    capabilities,
    groups: found.groups
  }
}
