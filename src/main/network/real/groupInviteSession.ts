import { randomUUID } from 'node:crypto'
import type { GroupType } from '../../../shared/navigation/types'
import {
  formatPairingCode,
  generatePairingCode,
  MAX_PAIRING_FAIL_PER_JOINER,
  normalizePairingCode,
  PAIRING_TTL_MS,
  type GroupInviteFoundBody,
  type GroupInviteLookupBody,
  type GroupInviteOfferBody,
  type GroupInviteResolveFailReason,
  type GroupInviteSessionView
} from '../../../shared/group/groupInvite.ts'

export type { GroupInviteSessionView } from '../../../shared/group/groupInvite.ts'

export interface GroupInviteSessionIdentity {
  deviceId: string
  userId: string
  displayName: string
  listenPort: number
  getHost: () => string | undefined
}

interface ActiveInvite {
  inviteId: string
  groupId: string
  groupName: string
  groupType: GroupType
  code: string
  expiresAt: number
  consumed: boolean
  failCounts: Map<string, number>
}

/** 群主分享「群邀请码」会话（按 groupId 独立，一次性） */
export class GroupInviteSessionHost {
  private readonly sessions = new Map<string, ActiveInvite>()
  private readonly identity: GroupInviteSessionIdentity

  constructor(identity: GroupInviteSessionIdentity) {
    this.identity = identity
  }

  start(groupId: string, groupName: string, groupType: GroupType): GroupInviteSessionView {
    this.cancel(groupId)
    const code = generatePairingCode()
    const inviteId = randomUUID()
    const expiresAt = Date.now() + PAIRING_TTL_MS
    this.sessions.set(groupId, {
      inviteId,
      groupId,
      groupName,
      groupType,
      code,
      expiresAt,
      consumed: false,
      failCounts: new Map()
    })
    return {
      inviteId,
      groupId,
      groupName,
      code,
      codeDisplay: formatPairingCode(code),
      expiresAt: new Date(expiresAt).toISOString()
    }
  }

  cancel(groupId: string): void {
    this.sessions.delete(groupId)
  }

  cancelAll(): void {
    this.sessions.clear()
  }

  isActive(groupId: string): boolean {
    return this.getSession(groupId) !== null
  }

  listActiveGroupIds(): string[] {
    const ids: string[] = []
    for (const groupId of this.sessions.keys()) {
      if (this.getSession(groupId)) ids.push(groupId)
    }
    return ids
  }

  buildOffer(groupId: string): GroupInviteOfferBody | null {
    const s = this.getSession(groupId)
    if (!s) return null
    return {
      code: s.code,
      inviteId: s.inviteId,
      groupId: s.groupId,
      groupName: s.groupName,
      groupType: s.groupType,
      ownerUserId: this.identity.userId,
      ownerDisplayName: this.identity.displayName,
      deviceId: this.identity.deviceId,
      listenPort: this.identity.listenPort,
      host: this.identity.getHost(),
      expiresAt: new Date(s.expiresAt).toISOString()
    }
  }

  buildOffers(): GroupInviteOfferBody[] {
    const offers: GroupInviteOfferBody[] = []
    for (const groupId of this.listActiveGroupIds()) {
      const offer = this.buildOffer(groupId)
      if (offer) offers.push(offer)
    }
    return offers
  }

  handleLookup(lookup: GroupInviteLookupBody): GroupInviteFoundBody | null {
    const result = this.handleResolve(lookup)
    return result.status === 'ok' ? result.body : null
  }

  handleResolve(
    lookup: GroupInviteLookupBody
  ): { status: 'ok'; body: GroupInviteFoundBody } | { status: 'fail'; reason: GroupInviteResolveFailReason } {
    const normalized = normalizePairingCode(lookup.code)
    const session = this.findSessionByCode(normalized)
    if (!session) {
      return { status: 'fail', reason: 'expired' }
    }

    if (session.consumed) {
      return { status: 'fail', reason: 'expired' }
    }

    if (normalized !== session.code) {
      const fails = (session.failCounts.get(lookup.joinerDeviceId) ?? 0) + 1
      session.failCounts.set(lookup.joinerDeviceId, fails)
      if (fails >= MAX_PAIRING_FAIL_PER_JOINER) {
        this.sessions.delete(session.groupId)
        return { status: 'fail', reason: 'rate_limit' }
      }
      return { status: 'fail', reason: 'mismatch' }
    }

    session.consumed = true
    const host = this.identity.getHost() ?? '127.0.0.1'
    return {
      status: 'ok',
      body: {
        inviteId: session.inviteId,
        groupId: session.groupId,
        groupName: session.groupName,
        groupType: session.groupType,
        ownerUserId: this.identity.userId,
        ownerDisplayName: this.identity.displayName,
        deviceId: this.identity.deviceId,
        listenPort: this.identity.listenPort,
        host
      }
    }
  }

  private findSessionByCode(code: string): ActiveInvite | null {
    for (const groupId of this.sessions.keys()) {
      const s = this.getSession(groupId)
      if (s && s.code === code) return s
    }
    return null
  }

  private getSession(groupId: string): ActiveInvite | null {
    const s = this.sessions.get(groupId)
    if (!s) return null
    if (Date.now() > s.expiresAt) {
      this.sessions.delete(groupId)
      return null
    }
    return s
  }
}
