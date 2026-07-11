import type { Database } from 'better-sqlite3'
import type { GroupTagMeta } from '../../../shared/task/groupTagMeta.ts'
import { normalizeGroupTagKey } from '../../../shared/task/groupTagMeta.ts'

type Row = {
  group_id: string
  tag_key: string
  label: string | null
  color: string
  updated_at: string
  updated_by_user_id: string | null
}

function rowToMeta(row: Row): GroupTagMeta {
  return {
    groupId: row.group_id,
    tagKey: row.tag_key,
    label: row.label ?? undefined,
    color: row.color,
    updatedAt: row.updated_at,
    updatedByUserId: row.updated_by_user_id ?? undefined
  }
}

export function listGroupTagMeta(db: Database, groupId: string): GroupTagMeta[] {
  const rows = db
    .prepare(
      `SELECT group_id, tag_key, label, color, updated_at, updated_by_user_id
       FROM group_tag_meta WHERE group_id = ? ORDER BY tag_key ASC`
    )
    .all(groupId) as Row[]
  return rows.map(rowToMeta)
}

export function getGroupTagMeta(
  db: Database,
  groupId: string,
  tagKey: string
): GroupTagMeta | null {
  const key = normalizeGroupTagKey(tagKey)
  const row = db
    .prepare(
      `SELECT group_id, tag_key, label, color, updated_at, updated_by_user_id
       FROM group_tag_meta WHERE group_id = ? AND tag_key = ?`
    )
    .get(groupId, key) as Row | undefined
  return row ? rowToMeta(row) : null
}

/** Local upsert (always write). */
export function upsertGroupTagMeta(db: Database, meta: GroupTagMeta): GroupTagMeta {
  const tagKey = normalizeGroupTagKey(meta.tagKey)
  db.prepare(
    `INSERT INTO group_tag_meta (group_id, tag_key, label, color, updated_at, updated_by_user_id)
     VALUES (@groupId, @tagKey, @label, @color, @updatedAt, @updatedByUserId)
     ON CONFLICT(group_id, tag_key) DO UPDATE SET
       label = excluded.label,
       color = excluded.color,
       updated_at = excluded.updated_at,
       updated_by_user_id = excluded.updated_by_user_id`
  ).run({
    groupId: meta.groupId,
    tagKey,
    label: meta.label ?? null,
    color: meta.color.trim(),
    updatedAt: meta.updatedAt,
    updatedByUserId: meta.updatedByUserId ?? null
  })
  return getGroupTagMeta(db, meta.groupId, tagKey)!
}

/** LWW remote apply: write only if newer than existing. Returns whether applied. */
export function applyRemoteGroupTagUpsert(db: Database, meta: GroupTagMeta): boolean {
  const existing = getGroupTagMeta(db, meta.groupId, meta.tagKey)
  if (existing && existing.updatedAt >= meta.updatedAt) return false
  upsertGroupTagMeta(db, meta)
  return true
}

export function deleteGroupTagMeta(db: Database, groupId: string, tagKey: string): boolean {
  const key = normalizeGroupTagKey(tagKey)
  const result = db
    .prepare(`DELETE FROM group_tag_meta WHERE group_id = ? AND tag_key = ?`)
    .run(groupId, key)
  return result.changes > 0
}

/** LWW remote delete: remove only if patch is newer than existing (or no row). */
export function applyRemoteGroupTagDelete(
  db: Database,
  groupId: string,
  tagKey: string,
  updatedAt: string
): boolean {
  const existing = getGroupTagMeta(db, groupId, tagKey)
  if (!existing) return false
  if (existing.updatedAt >= updatedAt) return false
  return deleteGroupTagMeta(db, groupId, tagKey)
}

export function countGroupTagMeta(db: Database, groupId: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM group_tag_meta WHERE group_id = ?`)
    .get(groupId) as { c: number }
  return row.c
}
