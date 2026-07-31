/** Lite mesh media signaling — SyncEnvelope `media_signal` payload (docs/03 §6.5.6). */

export const MEDIA_ROOM_MAX_PARTICIPANTS = 4

export type MediaSignalKind = 'join' | 'leave' | 'offer' | 'answer' | 'ice-candidate'

export interface MediaSignalPayload {
  signalId: string
  groupId: string
  kind: MediaSignalKind
  fromUserId: string
  fromDisplayName: string
  /** Directed WebRTC signaling; join/leave broadcast when omitted */
  toUserId?: string
  sdp?: string
  candidate?: string
  at: string
}

export type MediaRoomPhase = 'idle' | 'active'

export interface MediaRoomParticipant {
  userId: string
  displayName: string
  joinedAt: string
}

export interface MediaRoomState {
  groupId: string
  phase: MediaRoomPhase
  participants: MediaRoomParticipant[]
  maxParticipants: number
}

const SIGNAL_KINDS = new Set<MediaSignalKind>([
  'join',
  'leave',
  'offer',
  'answer',
  'ice-candidate'
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isMediaSignalKind(value: unknown): value is MediaSignalKind {
  return typeof value === 'string' && SIGNAL_KINDS.has(value as MediaSignalKind)
}

export function isMediaSignalPayload(value: unknown): value is MediaSignalPayload {
  if (!isRecord(value)) return false
  return (
    typeof value.signalId === 'string' &&
    typeof value.groupId === 'string' &&
    isMediaSignalKind(value.kind) &&
    typeof value.fromUserId === 'string' &&
    typeof value.fromDisplayName === 'string' &&
    typeof value.at === 'string' &&
    (value.toUserId === undefined || typeof value.toUserId === 'string') &&
    (value.sdp === undefined || typeof value.sdp === 'string') &&
    (value.candidate === undefined || typeof value.candidate === 'string')
  )
}
