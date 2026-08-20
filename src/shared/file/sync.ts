import type { FileMeta } from './types'

/** docs/03 / docs/04 — file_meta 广播（不含对端 storagePath） */
export interface FileMetaBroadcastPayload {
  meta: FileMeta
}

export type FileChunkEncoding = 'base64' | 'binary'

/**
 * docs/03 — file_pull_request。
 * `fromOffset`：已收字节数（续传）；缺省 / 0 = 从头拉取（TASK-164）。
 * `chunkEncoding`：缺省 / 未知 = base64（旧客户端）；`binary` = framed 密封明文（TASK-3401）。
 */
export interface FilePullRequestPayload {
  fileId: string
  groupId: string
  /** Inclusive byte offset to start sending chunks; omit or 0 = full file */
  fromOffset?: number
  chunkEncoding?: FileChunkEncoding
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

/** On-disk suffix for in-progress P2P downloads (TASK-166). */
export const PARTIAL_FILE_SUFFIX = '.partial'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isRemotePendingPath(storagePath: string): boolean {
  return storagePath.startsWith(REMOTE_PENDING_PREFIX)
}

export function isLocalRemovedPath(storagePath: string): boolean {
  return storagePath.startsWith(LOCAL_REMOVED_PREFIX)
}

export function isPartialFilePath(storagePath: string): boolean {
  return storagePath.endsWith(PARTIAL_FILE_SUFFIX)
}

/** `{groupDir}/{fileId}.partial` */
export function partialFileName(fileId: string): string {
  return `${fileId}${PARTIAL_FILE_SUFFIX}`
}

export function isFilePullRequestPayload(value: unknown): value is FilePullRequestPayload {
  if (!isRecord(value)) return false
  if (typeof value.fileId !== 'string' || !value.fileId) return false
  if (typeof value.groupId !== 'string' || !value.groupId) return false
  if (value.fromOffset !== undefined) {
    if (typeof value.fromOffset !== 'number' || !Number.isFinite(value.fromOffset)) return false
    if (value.fromOffset < 0 || !Number.isInteger(value.fromOffset)) return false
  }
  if (value.chunkEncoding !== undefined) {
    if (value.chunkEncoding !== 'base64' && value.chunkEncoding !== 'binary') return false
  }
  return true
}

/** Normalize missing fromOffset to 0. */
export function filePullFromOffset(payload: FilePullRequestPayload): number {
  return payload.fromOffset ?? 0
}

/** Missing / unknown → base64 (old clients). */
export function filePullChunkEncoding(payload: FilePullRequestPayload): FileChunkEncoding {
  return payload.chunkEncoding === 'binary' ? 'binary' : 'base64'
}

/** Bytes from JSON Base64 chunk or in-memory binary payload. */
export function fileChunkBody(payload: unknown): Buffer | null {
  if (!isRecord(payload)) return null
  if (Buffer.isBuffer(payload.chunk)) return payload.chunk
  if (typeof payload.chunkBase64 === 'string' && payload.chunkBase64.length > 0) {
    return Buffer.from(payload.chunkBase64, 'base64')
  }
  return null
}
