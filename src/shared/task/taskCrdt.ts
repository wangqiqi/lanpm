/**
 * docs/03 §6.2 / §10 — `task_crdt` 实时更新帧。
 * 每群单文档 `task:{groupId}`；Yjs update 以 base64 入信封（与 file_chunk 一致）。
 * Handler / 双写见 TASK-159+；本文件仅协议形状与校验。
 */

export interface TaskCrdtPayload {
  /** Must equal `task:{groupId}`（groupId 亦在 SyncEnvelope） */
  docId: string
  /** `Y.encodeStateAsUpdate` / update 二进制的 base64 */
  updateBase64: string
}

const DOC_ID_RE = /^task:[^:\s]+$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Canonical Y.Doc id for a project group. */
export function taskCrdtDocId(groupId: string): string {
  return `task:${groupId}`
}

export function isTaskCrdtPayload(value: unknown): value is TaskCrdtPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (typeof value.updateBase64 !== 'string' || value.updateBase64.length === 0) return false
  // Reject whitespace-only / obviously non-base64 empty padding abuse
  if (!/^[A-Za-z0-9+/]+=*$/.test(value.updateBase64)) return false
  return true
}

/** Optional envelope.groupId consistency check. */
export function taskCrdtDocIdMatchesGroup(docId: string, groupId: string): boolean {
  return docId === taskCrdtDocId(groupId)
}
