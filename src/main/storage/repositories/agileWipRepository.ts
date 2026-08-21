import type { Database } from 'better-sqlite3'
import type { ColumnWipLimits, TaskStatus } from '../../../shared/task/columnWip.ts'
import { isWipStatus, parseWipLimit } from '../../../shared/task/columnWip.ts'

interface LimitRow {
  group_id: string
  status: string
  wip_limit: number
}

export function listAgileWipLimits(db: Database, groupId: string): ColumnWipLimits {
  const rows = db
    .prepare(`SELECT group_id, status, wip_limit FROM agile_wip_limits WHERE group_id = ?`)
    .all(groupId) as LimitRow[]
  const limits: ColumnWipLimits = {}
  for (const row of rows) {
    if (!isWipStatus(row.status)) continue
    const n = parseWipLimit(row.wip_limit)
    if (n !== undefined) limits[row.status] = n
  }
  return limits
}

export function upsertAgileWipLimit(
  db: Database,
  groupId: string,
  status: TaskStatus,
  limit: number | null
): void {
  const parsed = parseWipLimit(limit)
  if (parsed === undefined) {
    db.prepare(`DELETE FROM agile_wip_limits WHERE group_id = ? AND status = ?`).run(groupId, status)
    return
  }
  db.prepare(
    `INSERT INTO agile_wip_limits (group_id, status, wip_limit)
     VALUES (?, ?, ?)
     ON CONFLICT(group_id, status) DO UPDATE SET wip_limit = excluded.wip_limit`
  ).run(groupId, status, parsed)
}

