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

export function countRootTodoTasks(db: Database, groupId: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM tasks
       WHERE group_id = ? AND status = 'todo'
       AND parent_task_id IS NULL AND deleted_at IS NULL`
    )
    .get(groupId) as { c: number }
  return row.c
}

export function getGroupTabBadges(db: Database, groupId: string): GroupTabBadges {
  const status = getSetupStatus(db)
  const userId = status.user?.userId
  if (!userId) {
    return { chatUnread: 0, boardTodo: 0 }
  }
  return {
    chatUnread: countUnreadMessages(db, groupId, userId),
    boardTodo: countRootTodoTasks(db, groupId)
  }
}
