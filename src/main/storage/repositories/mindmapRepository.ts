import type { Database } from 'better-sqlite3'
import type { MindmapDocument, MindmapDocumentSummary } from '../../../shared/mindmap/types.ts'

type Row = {
  doc_id: string
  group_id: string
  title: string
  file_id: string
  created_at: string
  updated_at: string
  created_by: string
}

function rowToDoc(row: Row): MindmapDocument {
  return {
    docId: row.doc_id,
    groupId: row.group_id,
    title: row.title,
    fileId: row.file_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by
  }
}

export function listMindmapDocuments(db: Database, groupId: string): MindmapDocumentSummary[] {
  const rows = db
    .prepare(
      `SELECT doc_id, group_id, title, updated_at
       FROM mindmap_documents
       WHERE group_id = ?
       ORDER BY updated_at DESC`
    )
    .all(groupId) as Array<Pick<Row, 'doc_id' | 'group_id' | 'title' | 'updated_at'>>
  return rows.map((row) => ({
    docId: row.doc_id,
    groupId: row.group_id,
    title: row.title,
    updatedAt: row.updated_at
  }))
}

export function listAllMindmapDocuments(db: Database): MindmapDocument[] {
  const rows = db
    .prepare(
      `SELECT doc_id, group_id, title, file_id, created_at, updated_at, created_by
       FROM mindmap_documents`
    )
    .all() as Row[]
  return rows.map(rowToDoc)
}

export function getMindmapDocument(db: Database, docId: string): MindmapDocument | null {
  const row = db
    .prepare(
      `SELECT doc_id, group_id, title, file_id, created_at, updated_at, created_by
       FROM mindmap_documents WHERE doc_id = ?`
    )
    .get(docId) as Row | undefined
  return row ? rowToDoc(row) : null
}

export function insertMindmapDocument(db: Database, doc: MindmapDocument): MindmapDocument {
  db.prepare(
    `INSERT INTO mindmap_documents (
      doc_id, group_id, title, file_id, created_at, updated_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    doc.docId,
    doc.groupId,
    doc.title,
    doc.fileId,
    doc.createdAt,
    doc.updatedAt,
    doc.createdBy
  )
  const saved = getMindmapDocument(db, doc.docId)
  if (!saved) throw new Error('mindmap document insert failed')
  return saved
}

export function updateMindmapDocumentTitle(
  db: Database,
  docId: string,
  title: string,
  updatedAt: string
): MindmapDocument {
  db.prepare(`UPDATE mindmap_documents SET title = ?, updated_at = ? WHERE doc_id = ?`).run(
    title,
    updatedAt,
    docId
  )
  const saved = getMindmapDocument(db, docId)
  if (!saved) throw new Error('mindmap document not found')
  return saved
}

export function touchMindmapDocument(db: Database, docId: string, updatedAt: string): void {
  db.prepare(`UPDATE mindmap_documents SET updated_at = ? WHERE doc_id = ?`).run(updatedAt, docId)
}

export function deleteMindmapDocument(db: Database, docId: string): MindmapDocument | null {
  const existing = getMindmapDocument(db, docId)
  if (!existing) return null
  db.prepare(`DELETE FROM mindmap_documents WHERE doc_id = ?`).run(docId)
  return existing
}
