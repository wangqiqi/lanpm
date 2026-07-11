import type { Database } from 'better-sqlite3'
import type { GroupMemberRecord, GroupRecord } from '../../../shared/group/types'
import type { GroupType } from '../../../shared/navigation/types'

interface GroupRow {
  group_id: string
  type: string
  name: string
  created_by: string
  created_at: string
  auto_discover: number
  project_meta_json: string | null
}

interface MemberRow {
  group_id: string
  user_id: string
  role: string
  joined_at: string
  display_alias: string | null
}

function rowToGroup(row: GroupRow): GroupRecord {
  return {
    groupId: row.group_id,
    type: row.type as GroupType,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    autoDiscover: row.auto_discover === 1
  }
}

export function insertGroup(db: Database, group: GroupRecord): void {
  db.prepare(
    `INSERT INTO groups (group_id, type, name, created_by, created_at, auto_discover, project_meta_json)
     VALUES (@groupId, @type, @name, @createdBy, @createdAt, @autoDiscover, NULL)`
  ).run({
    groupId: group.groupId,
    type: group.type,
    name: group.name,
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    autoDiscover: group.autoDiscover ? 1 : 0
  })
}

export function listGroups(db: Database): GroupRecord[] {
  const rows = db.prepare(`SELECT * FROM groups ORDER BY created_at ASC`).all() as GroupRow[]
  return rows.map(rowToGroup)
}

export function getGroupById(db: Database, groupId: string): GroupRecord | null {
  const row = db.prepare(`SELECT * FROM groups WHERE group_id = ?`).get(groupId) as GroupRow | undefined
  return row ? rowToGroup(row) : null
}

export function countGroups(db: Database): number {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM groups`).get() as { c: number }
  return row.c
}

export function insertGroupMember(db: Database, member: GroupMemberRecord): void {
  db.prepare(
    `INSERT OR REPLACE INTO group_members (group_id, user_id, role, joined_at, display_alias)
     VALUES (@groupId, @userId, @role, @joinedAt, @displayAlias)`
  ).run({
    groupId: member.groupId,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
    displayAlias: member.displayAlias ?? null
  })
}

export function listGroupMembers(db: Database, groupId: string): GroupMemberRecord[] {
  const rows = db
    .prepare(`SELECT * FROM group_members WHERE group_id = ? ORDER BY joined_at ASC`)
    .all(groupId) as MemberRow[]
  return rows.map((r) => ({
    groupId: r.group_id,
    userId: r.user_id,
    role: r.role as GroupMemberRecord['role'],
    joinedAt: r.joined_at,
    displayAlias: r.display_alias ?? undefined
  }))
}

export function countAnonymousAliases(db: Database, groupId: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM group_members WHERE group_id = ? AND display_alias IS NOT NULL`)
    .get(groupId) as { c: number }
  return row.c
}

export function getMemberAlias(
  db: Database,
  groupId: string,
  userId: string
): string | null {
  const row = db
    .prepare(`SELECT display_alias FROM group_members WHERE group_id = ? AND user_id = ?`)
    .get(groupId, userId) as { display_alias: string | null } | undefined
  return row?.display_alias ?? null
}

export function removeGroupMember(db: Database, groupId: string, userId: string): void {
  db.prepare(`DELETE FROM group_members WHERE group_id = ? AND user_id = ?`).run(groupId, userId)
}

export function updateGroupCreatedBy(db: Database, groupId: string, userId: string): void {
  db.prepare(`UPDATE groups SET created_by = ? WHERE group_id = ?`).run(userId, groupId)
}

/** 删除群组及关联数据（不含磁盘文件，由调用方先清理） */
export function deleteGroupCascade(db: Database, groupId: string): void {
  db.prepare(`DELETE FROM read_receipts WHERE group_id = ?`).run(groupId)
  db.prepare(`DELETE FROM messages WHERE group_id = ?`).run(groupId)
  db.prepare(
    `DELETE FROM task_dependencies
     WHERE from_task_id IN (SELECT task_id FROM tasks WHERE group_id = ?)
        OR to_task_id IN (SELECT task_id FROM tasks WHERE group_id = ?)`
  ).run(groupId, groupId)
  db.prepare(
    `DELETE FROM task_checklist_items
     WHERE task_id IN (SELECT task_id FROM tasks WHERE group_id = ?)
        OR checklist_id IN (SELECT checklist_id FROM task_checklists WHERE group_id = ?)`
  ).run(groupId, groupId)
  db.prepare(`DELETE FROM task_checklists WHERE group_id = ?`).run(groupId)
  db.prepare(`DELETE FROM tasks WHERE group_id = ?`).run(groupId)
  db.prepare(`DELETE FROM task_crdt_docs WHERE group_id = ?`).run(groupId)
  db.prepare(`DELETE FROM group_tag_meta WHERE group_id = ?`).run(groupId)
  db.prepare(`DELETE FROM whiteboard_scenes WHERE group_id = ?`).run(groupId)
  db.prepare(`DELETE FROM file_transfers WHERE group_id = ?`).run(groupId)
  db.prepare(`DELETE FROM files WHERE group_id = ?`).run(groupId)
  db.prepare(`DELETE FROM group_members WHERE group_id = ?`).run(groupId)
  db.prepare(`DELETE FROM groups WHERE group_id = ?`).run(groupId)
}

export function listProjectGroups(db: Database): GroupRecord[] {
  const rows = db
    .prepare(`SELECT * FROM groups WHERE type = 'project' ORDER BY name ASC`)
    .all() as GroupRow[]
  return rows.map(rowToGroup)
}
