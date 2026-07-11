import type { Database } from 'better-sqlite3'
import { taskCrdtDocId } from '../../../shared/task/taskCrdt.ts'

export interface TaskCrdtDocRow {
  groupId: string
  docId: string
  updateBlob: Buffer
  updatedAt: string
}

export function getTaskCrdtBlob(db: Database, groupId: string): TaskCrdtDocRow | null {
  const row = db
    .prepare(
      `SELECT group_id, doc_id, update_blob, updated_at
       FROM task_crdt_docs WHERE group_id = ?`
    )
    .get(groupId) as
    | { group_id: string; doc_id: string; update_blob: Buffer; updated_at: string }
    | undefined
  if (!row) return null
  return {
    groupId: row.group_id,
    docId: row.doc_id,
    updateBlob: row.update_blob,
    updatedAt: row.updated_at
  }
}

export function upsertTaskCrdtBlob(
  db: Database,
  groupId: string,
  updateBlob: Uint8Array | Buffer,
  updatedAt = new Date().toISOString()
): void {
  const docId = taskCrdtDocId(groupId)
  const blob = Buffer.isBuffer(updateBlob) ? updateBlob : Buffer.from(updateBlob)
  db.prepare(
    `INSERT INTO task_crdt_docs (group_id, doc_id, update_blob, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(group_id) DO UPDATE SET
       doc_id = excluded.doc_id,
       update_blob = excluded.update_blob,
       updated_at = excluded.updated_at`
  ).run(groupId, docId, blob, updatedAt)
}

export function deleteTaskCrdtBlob(db: Database, groupId: string): void {
  db.prepare(`DELETE FROM task_crdt_docs WHERE group_id = ?`).run(groupId)
}
