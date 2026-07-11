import type { FileMeta } from './types'

/** docs/03 / docs/04 — file_meta 广播（不含对端 storagePath） */
export interface FileMetaBroadcastPayload {
  meta: FileMeta
}

/**
 * docs/03 — file_pull_request。
 * `fromOffset`：已收字节数（续传）；缺省 / 0 = 从头拉取（TASK-164）。
 */
export interface FilePullRequestPayload {
  fileId: string
  groupId: string
  /** Inclusive byte offset to start sending chunks; omit or 0 = full file */
  fromOffset?: number
}

export interface FileChunkPayload {
  fileId: string
  groupId: string
  offset: number
  chunkBase64: string
  totalBytes: number
  sha256: string
  done: boolean
}

export const REMOTE_PENDING_PREFIX = 'remote-pending:'

export const LOCAL_REMOVED_PREFIX = 'local-removed:'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isRemotePendingPath(storagePath: string): boolean {
  return storagePath.startsWith(REMOTE_PENDING_PREFIX)
}

export function isLocalRemovedPath(storagePath: string): boolean {
  return storagePath.startsWith(LOCAL_REMOVED_PREFIX)
}

export function isFilePullRequestPayload(value: unknown): value is FilePullRequestPayload {
  if (!isRecord(value)) return false
  if (typeof value.fileId !== 'string' || !value.fileId) return false
  if (typeof value.groupId !== 'string' || !value.groupId) return false
  if (value.fromOffset !== undefined) {
    if (typeof value.fromOffset !== 'number' || !Number.isFinite(value.fromOffset)) return false
    if (value.fromOffset < 0 || !Number.isInteger(value.fromOffset)) return false
  }
  return true
}

/** Normalize missing fromOffset to 0. */
export function filePullFromOffset(payload: FilePullRequestPayload): number {
  return payload.fromOffset ?? 0
}
