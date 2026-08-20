/**
 * Mindmap Awareness — SyncEnvelope `mindmap_awareness` (SPRINT-26).
 */
import { mindmapCrdtDocId, mindmapCrdtDocIdMatches } from './mindmapCrdt.ts'

export interface MindmapAwarenessUser {
  name: string
  color: string
  colorLight: string
  userId?: string
}

export interface MindmapAwarenessLocalState {
  user: MindmapAwarenessUser
  selectedNodeId?: string
}

export interface MindmapAwarenessPayload {
  docId: string
  updateBase64: string
}

const BASE64_RE = /^[A-Za-z0-9+/]+=*$/
const DOC_ID_RE = /^mindmap:[^:\s]+$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyBase64(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && BASE64_RE.test(value)
}

export function isMindmapAwarenessPayload(value: unknown): value is MindmapAwarenessPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (!isNonEmptyBase64(value.updateBase64)) return false
  return true
}

export const mindmapAwarenessDocId = mindmapCrdtDocId
export const mindmapAwarenessDocIdMatches = mindmapCrdtDocIdMatches

export function mindmapAwarenessPayloadFromUpdate(
  docId: string,
  update: Uint8Array
): MindmapAwarenessPayload {
  return {
    docId: mindmapCrdtDocId(docId),
    updateBase64: Buffer.from(update).toString('base64')
  }
}

export function decodeMindmapAwarenessUpdate(payload: { updateBase64: string }): Uint8Array {
  return new Uint8Array(Buffer.from(payload.updateBase64, 'base64'))
}
