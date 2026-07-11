/**
 * Whiteboard Yjs sync frames — mirror `task_crdt` (TASK-258).
 * Doc id: `whiteboard:{groupId}`; binary updates as base64 in SyncEnvelope.
 */

export interface WhiteboardCrdtPayload {
  /** Must equal `whiteboard:{groupId}` */
  docId: string
  /** `Y.encodeStateAsUpdate` / update 二进制的 base64 */
  updateBase64: string
}

/** Offline catch-up request: local state vector → peer replies with diff */
export interface WhiteboardCrdtSyncRequestPayload {
  docId: string
  /** `Y.encodeStateVector` base64; empty = request full state */
  stateVectorBase64: string
}

/** Offline catch-up batch: diff relative to requester SV */
export interface WhiteboardCrdtSyncBatchPayload {
  docId: string
  updateBase64: string
}

const DOC_ID_RE = /^whiteboard:[^:\s]+$/
const BASE64_RE = /^[A-Za-z0-9+/]+=*$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyBase64(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && BASE64_RE.test(value)
}

/** Canonical Y.Doc id for a group whiteboard. */
export function whiteboardCrdtDocId(groupId: string): string {
  return `whiteboard:${groupId}`
}

export function isWhiteboardCrdtPayload(value: unknown): value is WhiteboardCrdtPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (!isNonEmptyBase64(value.updateBase64)) return false
  return true
}

export function isWhiteboardCrdtSyncRequestPayload(
  value: unknown
): value is WhiteboardCrdtSyncRequestPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (typeof value.stateVectorBase64 !== 'string') return false
  if (value.stateVectorBase64.length > 0 && !BASE64_RE.test(value.stateVectorBase64)) {
    return false
  }
  return true
}

export function isWhiteboardCrdtSyncBatchPayload(
  value: unknown
): value is WhiteboardCrdtSyncBatchPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (!isNonEmptyBase64(value.updateBase64)) return false
  return true
}

export function whiteboardCrdtDocIdMatchesGroup(docId: string, groupId: string): boolean {
  return docId === whiteboardCrdtDocId(groupId)
}

export function whiteboardCrdtPayloadFromUpdate(
  groupId: string,
  update: Uint8Array
): WhiteboardCrdtPayload {
  return {
    docId: whiteboardCrdtDocId(groupId),
    updateBase64: Buffer.from(update).toString('base64')
  }
}

export function decodeWhiteboardCrdtUpdate(payload: { updateBase64: string }): Uint8Array {
  return new Uint8Array(Buffer.from(payload.updateBase64, 'base64'))
}

export function encodeWhiteboardStateVectorBase64(sv: Uint8Array): string {
  return Buffer.from(sv).toString('base64')
}

export function decodeWhiteboardStateVectorBase64(b64: string): Uint8Array {
  if (!b64) return new Uint8Array()
  return new Uint8Array(Buffer.from(b64, 'base64'))
}
