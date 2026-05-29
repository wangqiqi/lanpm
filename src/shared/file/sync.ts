import type { FileMeta } from './types'

/** docs/04 — file_meta 广播（不含对端 storagePath） */
export interface FileMetaBroadcastPayload {
  meta: FileMeta
}

export interface FilePullRequestPayload {
  fileId: string
  groupId: string
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

export function isRemotePendingPath(storagePath: string): boolean {
  return storagePath.startsWith(REMOTE_PENDING_PREFIX)
}

export function isLocalRemovedPath(storagePath: string): boolean {
  return storagePath.startsWith(LOCAL_REMOVED_PREFIX)
}
