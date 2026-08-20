/**
 * Mindmap Yjs sync frames — mirror whiteboard_crdt (SPRINT-26).
 * Doc id: `mindmap:{docId}` (per document, not per group).
 */
export interface MindmapCrdtPayload {
  docId: string
  updateBase64: string
}

export interface MindmapCrdtSyncRequestPayload {
  docId: string
  stateVectorBase64: string
}

export interface MindmapCrdtSyncBatchPayload {
  docId: string
  updateBase64: string
}

const DOC_ID_RE = /^mindmap:[^:\s]+$/
const BASE64_RE = /^[A-Za-z0-9+/]+=*$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyBase64(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && BASE64_RE.test(value)
}

export function mindmapCrdtDocId(docId: string): string {
  return `mindmap:${docId}`
}

export function parseMindmapCrdtDocId(wiredId: string): string | null {
  if (!DOC_ID_RE.test(wiredId)) return null
  return wiredId.slice('mindmap:'.length)
}

export function isMindmapCrdtPayload(value: unknown): value is MindmapCrdtPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (!isNonEmptyBase64(value.updateBase64)) return false
  return true
}

export function isMindmapCrdtSyncRequestPayload(
  value: unknown
): value is MindmapCrdtSyncRequestPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (typeof value.stateVectorBase64 !== 'string') return false
  if (value.stateVectorBase64.length > 0 && !BASE64_RE.test(value.stateVectorBase64)) {
    return false
  }
  return true
}

export function isMindmapCrdtSyncBatchPayload(
  value: unknown
): value is MindmapCrdtSyncBatchPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (!isNonEmptyBase64(value.updateBase64)) return false
  return true
}

export function mindmapCrdtDocIdMatches(wiredId: string, docId: string): boolean {
  return wiredId === mindmapCrdtDocId(docId)
}

export function mindmapCrdtPayloadFromUpdate(
  docId: string,
  update: Uint8Array
): MindmapCrdtPayload {
  return {
    docId: mindmapCrdtDocId(docId),
    updateBase64: Buffer.from(update).toString('base64')
  }
}

export function decodeMindmapCrdtUpdate(payload: { updateBase64: string }): Uint8Array {
  return new Uint8Array(Buffer.from(payload.updateBase64, 'base64'))
}

export function encodeMindmapStateVectorBase64(sv: Uint8Array): string {
  return Buffer.from(sv).toString('base64')
}

export function decodeMindmapStateVectorBase64(b64: string): Uint8Array {
  if (!b64) return new Uint8Array()
  return new Uint8Array(Buffer.from(b64, 'base64'))
}
