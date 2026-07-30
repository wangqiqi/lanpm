import type { GroupType } from '../navigation/types'
import {
  formatPairingCode,
  generatePairingCode,
  MAX_PAIRING_FAIL_PER_JOINER,
  normalizePairingCode,
  PAIRING_LOOKUP_TIMEOUT_MS,
  PAIRING_OFFER_INTERVAL_MS,
  PAIRING_TTL_MS,
  type PairingResolveFailReason
} from '../network/pairingTypes.ts'

export {
  formatPairingCode,
  generatePairingCode,
  normalizePairingCode,
  PAIRING_LOOKUP_TIMEOUT_MS,
  PAIRING_OFFER_INTERVAL_MS,
  PAIRING_TTL_MS,
  MAX_PAIRING_FAIL_PER_JOINER
}
export type { PairingResolveFailReason as GroupInviteResolveFailReason }

export interface GroupInviteSessionView {
  inviteId: string
  groupId: string
  groupName: string
  code: string
  codeDisplay: string
  expiresAt: string
}

export interface GroupInviteOfferBody {
  code: string
  inviteId: string
  groupId: string
  groupName: string
  groupType: GroupType
  ownerUserId: string
  ownerDisplayName: string
  deviceId: string
  listenPort: number
  host?: string
  expiresAt: string
}

export interface GroupInviteLookupBody {
  code: string
  joinerDeviceId: string
  joinerDisplayName: string
}

export interface GroupInviteFoundBody {
  inviteId: string
  groupId: string
  groupName: string
  groupType: GroupType
  ownerUserId: string
  ownerDisplayName: string
  deviceId: string
  listenPort: number
  host: string
}

export type GroupInviteUdpPacket =
  | { v: 1; kind: 'group_invite_offer'; payload: GroupInviteOfferBody }
  | { v: 1; kind: 'group_invite_lookup'; payload: GroupInviteLookupBody }
  | { v: 1; kind: 'group_invite_found'; payload: GroupInviteFoundBody }

export function isGroupInviteUdpPacket(raw: unknown): raw is GroupInviteUdpPacket {
  if (!raw || typeof raw !== 'object') return false
  const p = raw as { v?: unknown; kind?: unknown }
  return (
    p.v === 1 &&
    (p.kind === 'group_invite_offer' ||
      p.kind === 'group_invite_lookup' ||
      p.kind === 'group_invite_found')
  )
}
