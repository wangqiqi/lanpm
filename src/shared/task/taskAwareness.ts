/**
 * docs/03 §6.2 / §10 — `task_awareness` 焦点 Presence（TASK-177+）。
 * 挂群级 Y.Doc 的 Yjs Awareness；短暂态，不落库。
 * 二进制帧由 `y-protocols/awareness` encode/apply。
 */

import { taskCrdtDocId, taskCrdtDocIdMatchesGroup } from './taskCrdt'

export type TaskAwarenessView = 'board' | 'tree' | null

/** Awareness.setLocalState 业务字段（非文本 caret） */
export interface TaskAwarenessLocalState {
  userId: string
  displayName: string
  /** 当前聚焦任务；无焦点时省略或 null */
  focusedTaskId?: string | null
  view: TaskAwarenessView
}

/** SyncEnvelope.payload for type `task_awareness` */
export interface TaskAwarenessPayload {
  /** Must equal `task:{groupId}` */
  docId: string
  /** `encodeAwarenessUpdate` 二进制的 base64 */
  updateBase64: string
}

const BASE64_RE = /^[A-Za-z0-9+/]+=*$/
const DOC_ID_RE = /^task:[^:\s]+$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyBase64(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && BASE64_RE.test(value)
}

function isView(value: unknown): value is TaskAwarenessView {
  return value === 'board' || value === 'tree' || value === null
}

export function isTaskAwarenessLocalState(value: unknown): value is TaskAwarenessLocalState {
  if (!isRecord(value)) return false
  if (typeof value.userId !== 'string' || value.userId.length === 0) return false
  if (typeof value.displayName !== 'string' || value.displayName.length === 0) return false
  if (!isView(value.view)) return false
  if (value.focusedTaskId !== undefined && value.focusedTaskId !== null) {
    if (typeof value.focusedTaskId !== 'string') return false
  }
  return true
}

export function isTaskAwarenessPayload(value: unknown): value is TaskAwarenessPayload {
  if (!isRecord(value)) return false
  if (typeof value.docId !== 'string' || !DOC_ID_RE.test(value.docId)) return false
  if (!isNonEmptyBase64(value.updateBase64)) return false
  return true
}

export const taskAwarenessDocId = taskCrdtDocId
export const taskAwarenessDocIdMatchesGroup = taskCrdtDocIdMatchesGroup

export function taskAwarenessPayloadFromUpdate(
  groupId: string,
  update: Uint8Array
): TaskAwarenessPayload {
  return {
    docId: taskCrdtDocId(groupId),
    updateBase64: Buffer.from(update).toString('base64')
  }
}

export function decodeTaskAwarenessUpdate(payload: { updateBase64: string }): Uint8Array {
  return new Uint8Array(Buffer.from(payload.updateBase64, 'base64'))
}
