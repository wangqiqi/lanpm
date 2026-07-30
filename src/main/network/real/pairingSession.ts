import { randomUUID } from 'node:crypto'
import type { DiscoverableGroupAdvert } from '../../../shared/discover/types'
import {
  formatPairingCode,
  generatePairingCode,
  MAX_PAIRING_FAIL_PER_JOINER,
  normalizePairingCode,
  PAIRING_TTL_MS,
  type PairingFoundBody,
  type PairingLookupBody,
  type PairingOfferBody
} from '../../../shared/network/pairingTypes.ts'

export interface PairingSessionView {
  pairingId: string
  code: string
  codeDisplay: string
  expiresAt: string
  groups: DiscoverableGroupAdvert[]
}

export interface PairingSessionIdentity {
  deviceId: string
  userId: string
  displayName: string
  listenPort: number
  getGroups: () => DiscoverableGroupAdvert[]
  getHost: () => string | undefined
}

interface ActiveSession {
  pairingId: string
  code: string
  expiresAt: number
  consumed: boolean
  failCounts: Map<string, number>
}

/** 发起方「分享群组连接码」会话 */
export class PairingSessionHost {
  private session: ActiveSession | null = null
  private readonly identity: PairingSessionIdentity

  constructor(identity: PairingSessionIdentity) {
    this.identity = identity
  }

  start(): PairingSessionView {
    this.cancel()
    const code = generatePairingCode()
    const pairingId = randomUUID()
    const expiresAt = Date.now() + PAIRING_TTL_MS
    this.session = {
      pairingId,
      code,
      expiresAt,
      consumed: false,
      failCounts: new Map()
    }
    const groups = this.identity.getGroups()
    return {
      pairingId,
      code,
      codeDisplay: formatPairingCode(code),
      expiresAt: new Date(expiresAt).toISOString(),
      groups
    }
  }

  cancel(): void {
    this.session = null
  }

  isActive(): boolean {
    return this.getSession() !== null
  }

  buildOffer(): PairingOfferBody | null {
    const s = this.getSession()
    if (!s) return null
    return {
      code: s.code,
      pairingId: s.pairingId,
      deviceId: this.identity.deviceId,
      userId: this.identity.userId,
      displayName: this.identity.displayName,
      listenPort: this.identity.listenPort,
      host: this.identity.getHost(),
      expiresAt: new Date(s.expiresAt).toISOString(),
      groups: this.identity.getGroups()
    }
  }

  handleLookup(lookup: PairingLookupBody): PairingFoundBody | null {
    const s = this.getSession()
    if (!s || s.consumed) return null

    const normalized = normalizePairingCode(lookup.code)
    if (normalized !== s.code) {
      const fails = (s.failCounts.get(lookup.joinerDeviceId) ?? 0) + 1
      s.failCounts.set(lookup.joinerDeviceId, fails)
      if (fails >= MAX_PAIRING_FAIL_PER_JOINER) this.cancel()
      return null
    }

    s.consumed = true
    const host = this.identity.getHost() ?? '127.0.0.1'
    return {
      pairingId: s.pairingId,
      deviceId: this.identity.deviceId,
      userId: this.identity.userId,
      displayName: this.identity.displayName,
      listenPort: this.identity.listenPort,
      host,
      groups: this.identity.getGroups()
    }
  }

  private getSession(): ActiveSession | null {
    if (!this.session) return null
    if (Date.now() > this.session.expiresAt) {
      this.session = null
      return null
    }
    return this.session
  }
}
