import type { Database } from 'better-sqlite3'
import { unlinkSync } from 'fs'
import type {
  ClearGroupMessagesMode,
  DataCleanupOptions,
  DataCleanupResult,
  DataStorageSettingsView
} from '../../shared/data/types'
import { SYNC_WINDOW_DAYS } from '../../shared/data/retention'
import { LOCAL_REMOVED_PREFIX, REMOTE_PENDING_PREFIX } from '../../shared/file/sync'
import { retentionCutoffIso } from '../../shared/data/retention'
import { getLocalRetentionDays, setLocalRetentionDays } from './retentionMeta'
import {
  pruneExpiredMessages,
  pruneSoftDeletedTasks
} from './messageRetentionService'
import {
  countMessages,
  deleteAllMessagesInGroup,
  deleteMessagesOlderThan
} from '../storage/repositories/messageRepository'
import { getFileById } from '../storage/repositories/fileRepository'
import { purgeOldTransfers } from '../storage/repositories/fileTransferRepository'
import { runReferentialCleanup } from '../storage/referentialCleanup'

export function getStorageSettings(db: Database): DataStorageSettingsView {
  return {
    localRetentionDays: getLocalRetentionDays(db),
    syncWindowDays: SYNC_WINDOW_DAYS,
    messageCount: countMessages(db)
  }
}

export function updateLocalRetentionDays(db: Database, days: number): number {
  return setLocalRetentionDays(db, days)
}

export function getStorageUsage(db: Database): { messageCount: number; fileCount: number } {
  const fileRow = db.prepare(`SELECT COUNT(*) AS c FROM files`).get() as { c: number }
  return { messageCount: countMessages(db), fileCount: fileRow.c }
}

export function runDataCleanup(db: Database, options: DataCleanupOptions): DataCleanupResult {
  const result: DataCleanupResult = {
    messagesDeleted: 0,
    receiptsDeleted: 0,
    transfersDeleted: 0,
    tasksDeleted: 0
  }
  if (options.chat) {
    const pruned = pruneExpiredMessages(db)
    result.messagesDeleted += pruned.messagesDeleted
    result.receiptsDeleted += pruned.receiptsDeleted
  }
  if (options.taskTrash) {
    result.tasksDeleted += pruneSoftDeletedTasks(db)
    runReferentialCleanup(db)
  }
  if (options.transfers) {
    result.transfersDeleted += purgeOldTransfers(db, 30)
  }
  if (options.files) {
    const rows = db
      .prepare(
        `SELECT file_id, storage_path FROM files
         WHERE storage_path NOT LIKE ? AND storage_path NOT LIKE ?`
      )
      .all(`${REMOTE_PENDING_PREFIX}%`, `${LOCAL_REMOVED_PREFIX}%`) as {
      file_id: string
      storage_path: string
    }[]
    for (const row of rows) {
      if (row.storage_path && !row.storage_path.startsWith(LOCAL_REMOVED_PREFIX)) {
        try {
          unlinkSync(row.storage_path)
        } catch {
          /* disk may already be gone */
        }
      }
      db.prepare(
        `UPDATE files SET storage_path = ?, updated_at = ? WHERE file_id = ?`
      ).run(`${LOCAL_REMOVED_PREFIX}${row.file_id}`, new Date().toISOString(), row.file_id)
    }
  }
  return result
}

export function clearGroupMessagesLocal(
  db: Database,
  groupId: string,
  mode: ClearGroupMessagesMode
): number {
  if (mode === 'all_local') {
    return deleteAllMessagesInGroup(db, groupId)
  }
  const cutoff = retentionCutoffIso(getLocalRetentionDays(db))
  return deleteMessagesOlderThan(db, cutoff, groupId)
}

export function deleteFileLocally(db: Database, fileId: string): boolean {
  const meta = getFileById(db, fileId)
  if (!meta || meta.isBookmark) return false
  if (meta.storagePath && !meta.storagePath.startsWith(REMOTE_PENDING_PREFIX)) {
    try {
      unlinkSync(meta.storagePath)
    } catch {
      /* ignore */
    }
  }
  db.prepare(`UPDATE files SET storage_path = ?, updated_at = ? WHERE file_id = ?`).run(
    `${LOCAL_REMOVED_PREFIX}${fileId}`,
    new Date().toISOString(),
    fileId
  )
  return true
}
