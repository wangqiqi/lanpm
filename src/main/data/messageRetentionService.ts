import type { Database } from 'better-sqlite3'
import { retentionCutoffIso } from '../../shared/data/retention'
import { purgeOldTransfers } from '../storage/repositories/fileTransferRepository'
import { runReferentialCleanup } from '../storage/referentialCleanup'
import { expireStaleRemotePending } from '../file/pendingFileService'
import { getLocalRetentionDays } from './retentionMeta'

const DAY_MS = 24 * 60 * 60 * 1000
let pruneTimer: ReturnType<typeof setInterval> | null = null

export interface PruneStats {
  messagesDeleted: number
  receiptsDeleted: number
}

export function pruneExpiredMessages(db: Database, retentionDays?: number): PruneStats {
  const days = retentionDays ?? getLocalRetentionDays(db)
  const cutoff = retentionCutoffIso(days)

  const msgResult = db
    .prepare(`DELETE FROM messages WHERE created_at < ?`)
    .run(cutoff)

  const receiptResult = db
    .prepare(
      `DELETE FROM read_receipts
       WHERE msg_id NOT IN (SELECT msg_id FROM messages)`
    )
    .run()

  return {
    messagesDeleted: msgResult.changes,
    receiptsDeleted: receiptResult.changes
  }
}

export function pruneSoftDeletedTasks(db: Database, retentionDays?: number): number {
  const days = retentionDays ?? getLocalRetentionDays(db)
  const cutoff = retentionCutoffIso(days)
  const deps = db
    .prepare(
      `DELETE FROM task_dependencies
       WHERE from_task_id IN (
         SELECT task_id FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < ?
       ) OR to_task_id IN (
         SELECT task_id FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < ?
       )`
    )
    .run(cutoff, cutoff)
  const tasks = db
    .prepare(`DELETE FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < ?`)
    .run(cutoff)
  return tasks.changes + deps.changes
}

export function initMessageRetentionScheduler(db: Database): void {
  pruneExpiredMessages(db)
  runReferentialCleanup(db)
  expireStaleRemotePending(db)
  if (pruneTimer) clearInterval(pruneTimer)
  pruneTimer = setInterval(() => {
    try {
      pruneExpiredMessages(db)
      pruneSoftDeletedTasks(db)
      expireStaleRemotePending(db)
      purgeOldTransfers(db, 30)
      runReferentialCleanup(db)
    } catch (err) {
      console.error('[lanpm] retention prune failed:', err)
    }
  }, DAY_MS)
}

export function shutdownMessageRetentionScheduler(): void {
  if (pruneTimer) clearInterval(pruneTimer)
  pruneTimer = null
}
