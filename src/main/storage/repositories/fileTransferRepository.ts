import type { Database } from 'better-sqlite3'
import type { FileTransferStatus, FileTransferView } from '../../../shared/file/types'

interface TransferRow {
  transfer_id: string
  file_id: string
  group_id: string
  direction: string
  from_device_id: string
  to_device_id: string
  status: string
  total_bytes: number
  transferred_bytes: number
  started_at: string
  finished_at: string | null
  error_message: string | null
}

export function insertTransfer(
  db: Database,
  row: {
    transferId: string
    fileId: string
    groupId: string
    direction: 'upload' | 'download'
    fromDeviceId: string
    toDeviceId: string
    status: FileTransferStatus
    totalBytes: number
    transferredBytes: number
    chunkSize: number
    checksum: string
    startedAt: string
    finishedAt?: string
    errorMessage?: string
  }
): void {
  db.prepare(
    `INSERT INTO file_transfers (
      transfer_id, file_id, group_id, direction, from_device_id, to_device_id,
      status, total_bytes, transferred_bytes, chunk_size, checksum,
      started_at, finished_at, error_message
    ) VALUES (
      @transferId, @fileId, @groupId, @direction, @fromDeviceId, @toDeviceId,
      @status, @totalBytes, @transferredBytes, @chunkSize, @checksum,
      @startedAt, @finishedAt, @errorMessage
    )`
  ).run({
    transferId: row.transferId,
    fileId: row.fileId,
    groupId: row.groupId,
    direction: row.direction,
    fromDeviceId: row.fromDeviceId,
    toDeviceId: row.toDeviceId,
    status: row.status,
    totalBytes: row.totalBytes,
    transferredBytes: row.transferredBytes,
    chunkSize: row.chunkSize,
    checksum: row.checksum,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt ?? null,
    errorMessage: row.errorMessage ?? null
  })
}

export function updateTransferProgress(
  db: Database,
  transferId: string,
  transferredBytes: number,
  status: FileTransferStatus
): void {
  db.prepare(
    `UPDATE file_transfers SET transferred_bytes = ?, status = ? WHERE transfer_id = ?`
  ).run(transferredBytes, status, transferId)
}

export function finishTransfer(
  db: Database,
  transferId: string,
  status: FileTransferStatus,
  errorMessage?: string
): void {
  db.prepare(
    `UPDATE file_transfers SET status = ?, finished_at = ?, error_message = ? WHERE transfer_id = ?`
  ).run(status, new Date().toISOString(), errorMessage ?? null, transferId)
}

export function listTransfersByGroup(db: Database, groupId: string): FileTransferView[] {
  const rows = db
    .prepare(
      `SELECT t.*, f.name AS file_name FROM file_transfers t
       LEFT JOIN files f ON f.file_id = t.file_id
       WHERE t.group_id = ?
       ORDER BY t.started_at DESC
       LIMIT 50`
    )
    .all(groupId) as (TransferRow & { file_name?: string })[]

  return rows.map((r) => ({
    transferId: r.transfer_id,
    fileId: r.file_id,
    groupId: r.group_id,
    direction: r.direction as 'upload' | 'download',
    fromDeviceId: r.from_device_id,
    toDeviceId: r.to_device_id,
    status: r.status as FileTransferStatus,
    totalBytes: r.total_bytes,
    transferredBytes: r.transferred_bytes,
    fileName: r.file_name ?? r.file_id,
    startedAt: r.started_at,
    finishedAt: r.finished_at ?? undefined,
    errorMessage: r.error_message ?? undefined
  }))
}

export function countActiveTransfers(db: Database): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM file_transfers
       WHERE status IN ('queued', 'transferring')`
    )
    .get() as { c: number }
  return row.c
}

export function getTransferById(db: Database, transferId: string): FileTransferView | null {
  const row = db
    .prepare(
      `SELECT t.*, f.name AS file_name FROM file_transfers t
       LEFT JOIN files f ON f.file_id = t.file_id
       WHERE t.transfer_id = ?`
    )
    .get(transferId) as (TransferRow & { file_name?: string }) | undefined
  if (!row) return null
  return {
    transferId: row.transfer_id,
    fileId: row.file_id,
    groupId: row.group_id,
    direction: row.direction as 'upload' | 'download',
    fromDeviceId: row.from_device_id,
    toDeviceId: row.to_device_id,
    status: row.status as FileTransferStatus,
    totalBytes: row.total_bytes,
    transferredBytes: row.transferred_bytes,
    fileName: row.file_name ?? row.file_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
    errorMessage: row.error_message ?? undefined
  }
}

export function listTransferHistory(db: Database, groupId: string, limit = 100): FileTransferView[] {
  const rows = db
    .prepare(
      `SELECT t.*, f.name AS file_name FROM file_transfers t
       LEFT JOIN files f ON f.file_id = t.file_id
       WHERE t.group_id = ?
         AND t.status IN ('completed', 'failed', 'cancelled', 'paused')
       ORDER BY COALESCE(t.finished_at, t.started_at) DESC
       LIMIT ?`
    )
    .all(groupId, limit) as (TransferRow & { file_name?: string })[]
  return rows.map((r) => ({
    transferId: r.transfer_id,
    fileId: r.file_id,
    groupId: r.group_id,
    direction: r.direction as 'upload' | 'download',
    fromDeviceId: r.from_device_id,
    toDeviceId: r.to_device_id,
    status: r.status as FileTransferStatus,
    totalBytes: r.total_bytes,
    transferredBytes: r.transferred_bytes,
    fileName: r.file_name ?? r.file_id,
    startedAt: r.started_at,
    finishedAt: r.finished_at ?? undefined,
    errorMessage: r.error_message ?? undefined
  }))
}

/** 清理已完成/失败且超过 maxAgeDays 的传输历史 */
export function purgeOldTransfers(db: Database, maxAgeDays: number): number {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString()
  const result = db
    .prepare(
      `DELETE FROM file_transfers
       WHERE status IN ('completed', 'failed', 'cancelled', 'paused')
         AND COALESCE(finished_at, started_at) < ?`
    )
    .run(cutoff)
  return result.changes
}

export function listResumableTransfers(db: Database, groupId: string): FileTransferView[] {
  const rows = db
    .prepare(
      `SELECT t.*, f.name AS file_name FROM file_transfers t
       LEFT JOIN files f ON f.file_id = t.file_id
       WHERE t.group_id = ?
         AND t.status IN ('failed', 'paused')
         AND t.transferred_bytes > 0
         AND t.transferred_bytes < t.total_bytes
       ORDER BY t.started_at DESC`
    )
    .all(groupId) as (TransferRow & { file_name?: string })[]
  return rows.map((r) => rowToView(r))
}

/** Latest download transfer for a file (any status) — for P2P resume. */
export function getLatestDownloadTransfer(
  db: Database,
  fileId: string
): FileTransferView | null {
  const row = db
    .prepare(
      `SELECT t.*, f.name AS file_name FROM file_transfers t
       LEFT JOIN files f ON f.file_id = t.file_id
       WHERE t.file_id = ? AND t.direction = 'download'
       ORDER BY t.started_at DESC
       LIMIT 1`
    )
    .get(fileId) as (TransferRow & { file_name?: string }) | undefined
  return row ? rowToView(row) : null
}

function rowToView(r: TransferRow & { file_name?: string }): FileTransferView {
  return {
    transferId: r.transfer_id,
    fileId: r.file_id,
    groupId: r.group_id,
    direction: r.direction as 'upload' | 'download',
    fromDeviceId: r.from_device_id,
    toDeviceId: r.to_device_id,
    status: r.status as FileTransferStatus,
    totalBytes: r.total_bytes,
    transferredBytes: r.transferred_bytes,
    fileName: r.file_name ?? r.file_id,
    startedAt: r.started_at,
    finishedAt: r.finished_at ?? undefined,
    errorMessage: r.error_message ?? undefined
  }
}
