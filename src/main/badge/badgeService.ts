import type { Database } from 'better-sqlite3'
import type { GroupTabBadges } from '../../shared/badge/types'
import { retentionCutoffIso } from '../../shared/data/retention'
import { getLocalRetentionDays } from '../data/retentionMeta'
import { getSetupStatus } from '../identity/setup'

export function countUnreadMessages(
  db: Database,
  groupId: string,
  readerUserId: string
): number {
  const cutoff = retentionCutoffIso(getLocalRetentionDays(db))
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM messages m
       WHERE m.group_id = ?
       AND m.created_at >= ?
       AND m.sender_user_id != ?
       AND NOT EXISTS (
         SELECT 1 FROM read_receipts r
         WHERE r.msg_id = m.msg_id AND r.reader_user_id = ?
       )`
    )
    .get(groupId, cutoff, readerUserId, readerUserId) as { c: number }
  return row.c
}

/** 指派给 userId 且 status ∈ {todo, doing} 的未删除任务数 */
export function countMineOpenTasks(
  db: Database,
  groupId: string,
  assigneeUserId: string
): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM tasks
       WHERE group_id = ?
       AND assignee_user_id = ?
       AND status IN ('todo', 'doing')
       AND deleted_at IS NULL`
    )
    .get(groupId, assigneeUserId) as { c: number }
  return row.c
}

/** 群内未删除任务的最大 updated_at */
export function getBoardLatestUpdatedAt(
  db: Database,
  groupId: string
): string | null {
  const row = db
    .prepare(
      `SELECT MAX(updated_at) AS m FROM tasks
       WHERE group_id = ? AND deleted_at IS NULL`
    )
    .get(groupId) as { m: string | null }
  return row.m ?? null
}

export function getGroupTabBadges(db: Database, groupId: string): GroupTabBadges {
  const status = getSetupStatus(db)
  const userId = status.user?.userId
  const boardLatestUpdatedAt = getBoardLatestUpdatedAt(db, groupId)
  if (!userId) {
    return { chatUnread: 0, boardMineOpen: 0, boardLatestUpdatedAt }
  }
  return {
    chatUnread: countUnreadMessages(db, groupId, userId),
    boardMineOpen: countMineOpenTasks(db, groupId, userId),
    boardLatestUpdatedAt
  }
}
