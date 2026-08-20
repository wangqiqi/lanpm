import type { Database } from 'better-sqlite3'
import { mindmapCrdtDocId } from '../../../shared/mindmap/mindmapCrdt.ts'

export interface MindmapCrdtDocRow {
  docId: string
  groupId: string
  wiredDocId: string
  updateBlob: Buffer
  updatedAt: string
}

export function getMindmapCrdtBlob(db: Database, docId: string): MindmapCrdtDocRow | null {
  const row = db
    .prepare(
      `SELECT doc_id, group_id, wired_doc_id, update_blob, updated_at
       FROM mindmap_crdt_docs WHERE doc_id = ?`
    )
    .get(docId) as
    | {
        doc_id: string
        group_id: string
        wired_doc_id: string
        update_blob: Buffer
        updated_at: string
      }
    | undefined
  if (!row) return null
  return {
    docId: row.doc_id,
    groupId: row.group_id,
    wiredDocId: row.wired_doc_id,
    updateBlob: row.update_blob,
    updatedAt: row.updated_at
  }
}

export function upsertMindmapCrdtBlob(
  db: Database,
  docId: string,
  groupId: string,
  updateBlob: Uint8Array | Buffer,
  updatedAt = new Date().toISOString()
): void {
  const blob = Buffer.isBuffer(updateBlob) ? updateBlob : Buffer.from(updateBlob)
  db.prepare(
    `INSERT INTO mindmap_crdt_docs (doc_id, group_id, wired_doc_id, update_blob, updated_at)
     VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(doc_id) DO UPDATE SET
       group_id = excluded.group_id,
       wired_doc_id = excluded.wired_doc_id,
       update_blob = excluded.update_blob,
       updated_at = excluded.updated_at`
  ).run(docId, groupId, mindmapCrdtDocId(docId), blob, updatedAt)
}

export function deleteMindmapCrdtBlob(db: Database, docId: string): void {
  db.prepare(`DELETE FROM mindmap_crdt_docs WHERE doc_id = ?`).run(docId)
}

export function deleteMindmapCrdtBlobsForGroup(db: Database, groupId: string): void {
  db.prepare(`DELETE FROM mindmap_crdt_docs WHERE group_id = ?`).run(groupId)
}
