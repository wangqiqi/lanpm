import type { Database } from 'better-sqlite3'
import { retentionCutoffIso } from '../../shared/data/retention'
import { REMOTE_PENDING_PREFIX } from '../../shared/file/sync'

export function expireStaleRemotePending(db: Database, maxAgeDays = 7): number {
  const cutoff = retentionCutoffIso(maxAgeDays)
  const result = db
    .prepare(
      `UPDATE files SET preview_status = 'failed', updated_at = ?
       WHERE storage_path LIKE ? AND uploaded_at < ? AND preview_status != 'failed'`
    )
    .run(new Date().toISOString(), `${REMOTE_PENDING_PREFIX}%`, cutoff)
  return result.changes
}
