/**
 * docs/03 §6.2 / §10 — `task_crdt` 实时更新帧 + 离线 state-vector 补拉（TASK-161）。
 * 每群单文档 `task:{groupId}`；Yjs 二进制以 base64 入信封。
 */

export interface TaskCrdtPayload {
  /** Must equal `task:{groupId}`（groupId 亦在 SyncEnvelope） */
  docId: string
  /** `Y.encodeStateAsUpdate` / update 二进制的 base64 */
  updateBase64: string
}

/** 离线补拉请求：携带本端 state vector，对端回 diff */
export interface TaskCrdtSyncRequestPayload {
  docId: string
  /** `Y.encodeStateVector` base64；空串 = 本端无状态，请求全量 */
  stateVectorBase64: string
}

/** 离线补拉批次：对端相对请求方 SV 的 diff update */
export interface TaskCrdtSyncBatchPayload {
  docId: string
  updateBase64: string
}

const DOC_ID_RE = /^task:[^:\s]+$/
const BASE64_RE = /^[A-Za-z0-9+/]+=*$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyBase64(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && BASE64_RE.test(value)
}

/** Canonical Y.Doc id for a project group. */
export function taskCrdtDocId(groupId: string): string {
  return `task:${groupId}`
}

export function isTaskCrdtPayload(value: unknown): value is TaskCrdtPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (!isNonEmptyBase64(value.updateBase64)) return false
  return true
}

export function isTaskCrdtSyncRequestPayload(
  value: unknown
): value is TaskCrdtSyncRequestPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (typeof value.stateVectorBase64 !== 'string') return false
  if (value.stateVectorBase64.length > 0 && !BASE64_RE.test(value.stateVectorBase64)) {
    return false
  }
  return true
}

export function isTaskCrdtSyncBatchPayload(value: unknown): value is TaskCrdtSyncBatchPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (!isNonEmptyBase64(value.updateBase64)) return false
  return true
}

/** Optional envelope.groupId consistency check. */
export function taskCrdtDocIdMatchesGroup(docId: string, groupId: string): boolean {
  return docId === taskCrdtDocId(groupId)
}

export function taskCrdtPayloadFromUpdate(
  groupId: string,
  update: Uint8Array
): TaskCrdtPayload {
  return {
    docId: taskCrdtDocId(groupId),
    updateBase64: Buffer.from(update).toString('base64')
  }
}

export function decodeTaskCrdtUpdate(payload: { updateBase64: string }): Uint8Array {
  return new Uint8Array(Buffer.from(payload.updateBase64, 'base64'))
}

export function encodeStateVectorBase64(sv: Uint8Array): string {
  return Buffer.from(sv).toString('base64')
}

export function decodeStateVectorBase64(b64: string): Uint8Array {
  if (!b64) return new Uint8Array()
  return new Uint8Array(Buffer.from(b64, 'base64'))
}
