import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import type { SyncEnvelope } from '../../shared/network/types.ts'
import type { NetworkTransport } from '../../shared/network/index.ts'
import {
  type MediaSignalKind,
  type MediaSignalPayload,
  isMediaSignalPayload
} from '../../shared/media/mediaSignal.ts'
import { MediaSignalRoomRegistry } from '../../shared/media/mediaSignalRoom.ts'
import { getSetupStatus } from '../identity/setup.ts'
import { getNetworkTransport } from '../network/index.ts'
import { catchSyncFailure } from '../utils/reportSyncFailure.ts'

const registry = new MediaSignalRoomRegistry()

let mediaSignalUnsub: (() => void) | null = null

async function publishMediaSignal(db: Database, payload: MediaSignalPayload): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const envelope: SyncEnvelope = {
    version: 1,
    type: 'media_signal',
    msgId: `ms_${payload.signalId}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId: payload.groupId,
    ts: payload.at,
    payload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

export async function sendMediaSignal(
  db: Database,
  args: Record<string, unknown>
): Promise<{ ok: boolean; signalId: string }> {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    throw new Error('identity_required')
  }

  const groupId = String(args.groupId ?? '')
  if (!groupId) throw new Error('groupId required')

  const kind = args.kind as MediaSignalKind
  if (typeof kind !== 'string') throw new Error('kind required')

  const signalId = String(args.signalId ?? `ms_${randomUUID()}`)
  const now = new Date().toISOString()

  const payload: MediaSignalPayload = {
    signalId,
    groupId,
    kind,
    fromUserId: status.user.userId,
    fromDisplayName: status.user.displayName,
    toUserId: args.toUserId ? String(args.toUserId) : undefined,
    sdp: args.sdp ? String(args.sdp) : undefined,
    candidate: args.candidate ? String(args.candidate) : undefined,
    at: now
  }

  if (!isMediaSignalPayload(payload)) {
    throw new Error('invalid_media_signal')
  }

  if (kind === 'join') {
    registry.joinRoom(groupId, status.user.userId, status.user.displayName)
  } else if (kind === 'leave') {
    registry.leaveRoom(groupId, status.user.userId)
  }

  await publishMediaSignal(db, payload).catch(
    catchSyncFailure('media.publishSignal', { notify: false })
  )

  return { ok: true, signalId }
}

export function pollMediaSignals(
  db: Database,
  args: Record<string, unknown>
): { messages: MediaSignalPayload[]; cursor: string } {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    return { messages: [], cursor: '' }
  }

  const groupId = String(args.groupId ?? '')
  if (!groupId) throw new Error('groupId required')

  const since = String(args.since ?? args.cursor ?? '')
  return registry.pollInbox(groupId, status.user.userId, since)
}

export function getMediaRoomState(db: Database, groupId: string) {
  void db
  return registry.getRoomState(groupId)
}

export function handleIncomingMediaSignal(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'media_signal') return
  if (!isMediaSignalPayload(envelope.payload)) return

  const status = getSetupStatus(db)
  if (!status.configured || !status.user) return

  registry.ingestRemoteSignal(status.user.userId, envelope.payload)
}

export function initMediaSignalService(db: Database): void {
  mediaSignalUnsub?.()
  mediaSignalUnsub = null

  const transport = getNetworkTransport()
  if (!transport) return

  const withGlobal = transport as NetworkTransport & {
    subscribeAll?: (handler: (envelope: SyncEnvelope) => void) => () => void
  }
  if (typeof withGlobal.subscribeAll !== 'function') return

  mediaSignalUnsub = withGlobal.subscribeAll((env: SyncEnvelope) => {
    handleIncomingMediaSignal(db, env)
  })
}

export function shutdownMediaSignalService(): void {
  mediaSignalUnsub?.()
  mediaSignalUnsub = null
}

/** Test-only reset */
export function resetMediaSignalStateForTest(): void {
  registry.reset()
}

/** Test-only registry access */
export function getMediaSignalRegistryForTest(): MediaSignalRoomRegistry {
  return registry
}
