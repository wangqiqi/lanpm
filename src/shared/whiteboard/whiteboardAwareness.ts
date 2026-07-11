/**
 * Whiteboard pointer Awareness — SyncEnvelope type `whiteboard_awareness` (TASK-258).
 * Ephemeral; shares docId with whiteboard CRDT (`whiteboard:{groupId}`).
 */

import {
  whiteboardCrdtDocId,
  whiteboardCrdtDocIdMatchesGroup
} from './whiteboardCrdt.ts'

/** Local collaborator fields (y-excalidraw expects `user` on awareness). */
export interface WhiteboardAwarenessUser {
  name: string
  color: string
  colorLight: string
  userId?: string
}

export interface WhiteboardAwarenessLocalState {
  user: WhiteboardAwarenessUser
}

/** SyncEnvelope.payload for type `whiteboard_awareness` */
export interface WhiteboardAwarenessPayload {
  docId: string
  /** `encodeAwarenessUpdate` binary as base64 */
  updateBase64: string
}

const BASE64_RE = /^[A-Za-z0-9+/]+=*$/
const DOC_ID_RE = /^whiteboard:[^:\s]+$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyBase64(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && BASE64_RE.test(value)
}

export function isWhiteboardAwarenessUser(value: unknown): value is WhiteboardAwarenessUser {
  if (!isRecord(value)) return false
  if (typeof value.name !== 'string' || value.name.length === 0) return false
  if (typeof value.color !== 'string' || value.color.length === 0) return false
  if (typeof value.colorLight !== 'string' || value.colorLight.length === 0) return false
  if (value.userId !== undefined && typeof value.userId !== 'string') return false
  return true
}

export function isWhiteboardAwarenessLocalState(
  value: unknown
): value is WhiteboardAwarenessLocalState {
  if (!isRecord(value)) return false
  return isWhiteboardAwarenessUser(value.user)
}

export function isWhiteboardAwarenessPayload(
  value: unknown
): value is WhiteboardAwarenessPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (!isNonEmptyBase64(value.updateBase64)) return false
  return true
}

export const whiteboardAwarenessDocId = whiteboardCrdtDocId
export const whiteboardAwarenessDocIdMatchesGroup = whiteboardCrdtDocIdMatchesGroup

export function whiteboardAwarenessPayloadFromUpdate(
  groupId: string,
  update: Uint8Array
): WhiteboardAwarenessPayload {
  return {
    docId: whiteboardCrdtDocId(groupId),
    updateBase64: Buffer.from(update).toString('base64')
  }
}

export function decodeWhiteboardAwarenessUpdate(payload: {
  updateBase64: string
}): Uint8Array {
  return new Uint8Array(Buffer.from(payload.updateBase64, 'base64'))
}
