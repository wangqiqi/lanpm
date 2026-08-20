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

/** A6 offline catch-up (TASK-4801) — 7-day window aligned with task/tag. */
export interface FileMetaSyncRequestPayload {
  /** Exclusive lower bound; empty = from epoch */
  sinceUpdatedAt: string
  /** 7-day cutoff ISO8601 */
  minUpdatedAt: string
}

export interface FileMetaSyncBatchPayload {
  files: FileMeta[]
  hasMore?: boolean
}

export const FILE_META_OFFLINE_SYNC_BATCH_LIMIT = 80

export function splitFileMetaOfflineSyncPage(
  rows: FileMeta[],
  limit = FILE_META_OFFLINE_SYNC_BATCH_LIMIT
): { files: FileMeta[]; hasMore: boolean } {
  if (rows.length > limit) {
    return { files: rows.slice(0, limit), hasMore: true }
  }
  return { files: rows, hasMore: false }
}

export function maxUpdatedAtInFileMetas(files: FileMeta[]): string {
  let max = ''
  for (const row of files) {
    if (row.updatedAt > max) max = row.updatedAt
  }
  return max
}

export function isFileMetaSyncRequestPayload(
  value: unknown
): value is FileMetaSyncRequestPayload {
  if (!isRecord(value)) return false
  return (
    typeof value.sinceUpdatedAt === 'string' &&
    typeof value.minUpdatedAt === 'string' &&
    !!value.minUpdatedAt
  )
}

function isFileMetaWire(value: unknown): value is FileMeta {
  if (!isRecord(value)) return false
  if (typeof value.fileId !== 'string' || !value.fileId) return false
  if (typeof value.groupId !== 'string' || !value.groupId) return false
  if (typeof value.name !== 'string' || !value.name) return false
  if (typeof value.ext !== 'string') return false
  if (typeof value.category !== 'string' || !value.category) return false
  if (typeof value.size !== 'number' || !Number.isFinite(value.size)) return false
  if (typeof value.uploadedBy !== 'string' || !value.uploadedBy) return false
  if (typeof value.uploadedAt !== 'string' || !value.uploadedAt) return false
  if (typeof value.sha256 !== 'string' || !value.sha256) return false
  if (typeof value.storagePath !== 'string' || !value.storagePath) return false
  if (typeof value.previewStatus !== 'string' || !value.previewStatus) return false
  if (typeof value.isBookmark !== 'boolean') return false
  if (typeof value.updatedAt !== 'string' || !value.updatedAt) return false
  return true
}

export function isFileMetaSyncBatchPayload(value: unknown): value is FileMetaSyncBatchPayload {
  if (!isRecord(value)) return false
  if (!Array.isArray(value.files)) return false
  if (value.hasMore !== undefined && typeof value.hasMore !== 'boolean') return false
  return value.files.every(isFileMetaWire)
}

/** Strip local disk paths before publishing an index row. */
export function toFileMetaSyncWire(meta: FileMeta): FileMeta {
  return {
    ...meta,
    storagePath: `${REMOTE_PENDING_PREFIX}${meta.fileId}`,
    previewStatus: 'none',
    previewPath: undefined
  }
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
