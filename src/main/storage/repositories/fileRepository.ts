import type { Database } from 'better-sqlite3'
import type { FileCategory, FileMeta, FilePreviewStatus } from '../../../shared/file/types.ts'
import { isDirectPreviewReady } from '../../../shared/file/previewExtensions.ts'

interface FileRow {
  file_id: string
  group_id: string
  name: string
  ext: string
  category: string
  size: number
  mime_type: string | null
  uploaded_by: string
  uploaded_at: string
  sha256: string
  storage_path: string
  preview_status: string
  preview_path: string | null
  is_bookmark: number
  bookmark_url: string | null
  bookmark_title: string | null
  updated_at: string
}

function rowToMeta(row: FileRow): FileMeta {
  return {
    fileId: row.file_id,
    groupId: row.group_id,
    name: row.name,
    ext: row.ext,
    category: row.category as FileCategory,
    size: row.size,
    mimeType: row.mime_type ?? undefined,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    sha256: row.sha256,
    storagePath: row.storage_path,
    previewStatus: row.preview_status as FilePreviewStatus,
    previewPath: row.preview_path ?? undefined,
    isBookmark: row.is_bookmark === 1,
    bookmarkUrl: row.bookmark_url ?? undefined,
    bookmarkTitle: row.bookmark_title ?? undefined,
    updatedAt: row.updated_at
  }
}

export function insertFile(db: Database, meta: FileMeta): void {
  db.prepare(
    `INSERT INTO files (
      file_id, group_id, name, ext, category, size, mime_type,
      uploaded_by, uploaded_at, sha256, storage_path,
      preview_status, preview_path, is_bookmark, bookmark_url, bookmark_title,
      updated_at
    ) VALUES (
      @fileId, @groupId, @name, @ext, @category, @size, @mimeType,
      @uploadedBy, @uploadedAt, @sha256, @storagePath,
      @previewStatus, @previewPath, @isBookmark, @bookmarkUrl, @bookmarkTitle,
      @updatedAt
    )`
  ).run({
    fileId: meta.fileId,
    groupId: meta.groupId,
    name: meta.name,
    ext: meta.ext,
    category: meta.category,
    size: meta.size,
    mimeType: meta.mimeType ?? null,
    uploadedBy: meta.uploadedBy,
    uploadedAt: meta.uploadedAt,
    sha256: meta.sha256,
    storagePath: meta.storagePath,
    previewStatus: meta.previewStatus,
    previewPath: meta.previewPath ?? null,
    isBookmark: meta.isBookmark ? 1 : 0,
    bookmarkUrl: meta.bookmarkUrl ?? null,
    bookmarkTitle: meta.bookmarkTitle ?? null,
    updatedAt: meta.updatedAt
  })
}

export function updateFilePreview(
  db: Database,
  fileId: string,
  previewStatus: FilePreviewStatus,
  previewPath?: string
): void {
  db.prepare(
    `UPDATE files SET preview_status = ?, preview_path = ?, updated_at = ? WHERE file_id = ?`
  ).run(previewStatus, previewPath ?? null, new Date().toISOString(), fileId)
}

/** 修复历史上传后 preview_path 被清空的记录，并将可直读预览的文件标记为 ready */
export function repairFilePreviewPaths(db: Database): void {
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE files
     SET preview_path = storage_path, updated_at = ?
     WHERE preview_status = 'ready'
       AND (preview_path IS NULL OR preview_path = '')
       AND is_bookmark = 0`
  ).run(now)

  const rows = db
    .prepare(
      `SELECT file_id, name, ext, storage_path, preview_status FROM files WHERE is_bookmark = 0`
    )
    .all() as Pick<FileRow, 'file_id' | 'name' | 'ext' | 'storage_path' | 'preview_status'>[]

  const toUpdate = rows.filter(
    (r) => isDirectPreviewReady({ name: r.name, ext: r.ext }) && r.preview_status !== 'ready'
  )

  if (toUpdate.length === 0) return

  const stmt = db.prepare(
    `UPDATE files SET preview_status = ?, preview_path = ?, updated_at = ? WHERE file_id = ?`
  )
  
  const transaction = db.transaction((items: typeof toUpdate) => {
    for (const item of items) {
      stmt.run('ready', item.storage_path, now, item.file_id)
    }
  })
  
  transaction(toUpdate)
}

export function listFilesByGroup(
  db: Database,
  groupId: string,
  category?: FileCategory
): FileMeta[] {
  const rows = category
    ? (db
        .prepare(`SELECT * FROM files WHERE group_id = ? AND category = ? ORDER BY uploaded_at DESC`)
        .all(groupId, category) as FileRow[])
    : (db
        .prepare(`SELECT * FROM files WHERE group_id = ? ORDER BY uploaded_at DESC`)
        .all(groupId) as FileRow[])
  return rows.map(rowToMeta)
}

/**
 * Offline pull: non-bookmark rows with updated_at > sinceUpdatedAt and >= minUpdatedAt.
 * Ordered ASC so the last row's updatedAt is the next-page cursor.
 */
export function listFileMetaSince(
  db: Database,
  groupId: string,
  sinceUpdatedAt: string,
  minUpdatedAt: string,
  limit = 80
): FileMeta[] {
  const rows = db
    .prepare(
      `SELECT * FROM files
       WHERE group_id = ?
         AND is_bookmark = 0
         AND updated_at > ?
         AND updated_at >= ?
       ORDER BY updated_at ASC, file_id ASC
       LIMIT ?`
    )
    .all(groupId, sinceUpdatedAt, minUpdatedAt, limit) as FileRow[]
  return rows.map(rowToMeta)
}

export function getMaxFileMetaUpdatedAt(db: Database, groupId: string): string {
  const row = db
    .prepare(
      `SELECT MAX(updated_at) AS max_at FROM files WHERE group_id = ? AND is_bookmark = 0`
    )
    .get(groupId) as { max_at: string | null } | undefined
  return row?.max_at ?? ''
}

export function getFileById(db: Database, fileId: string): FileMeta | null {
  const row = db.prepare(`SELECT * FROM files WHERE file_id = ?`).get(fileId) as FileRow | undefined
  return row ? rowToMeta(row) : null
}

export function updateFileContent(
  db: Database,
  fileId: string,
  patch: { name?: string; size: number; sha256: string; updatedAt: string }
): FileMeta | null {
  const existing = getFileById(db, fileId)
  if (!existing) return null
  if (patch.name !== undefined) {
    db.prepare(
      `UPDATE files SET name = ?, size = ?, sha256 = ?, updated_at = ? WHERE file_id = ?`
    ).run(patch.name, patch.size, patch.sha256, patch.updatedAt, fileId)
  } else {
    db.prepare(`UPDATE files SET size = ?, sha256 = ?, updated_at = ? WHERE file_id = ?`).run(
      patch.size,
      patch.sha256,
      patch.updatedAt,
      fileId
    )
  }
  return getFileById(db, fileId)
}

export function updateFileName(db: Database, fileId: string, name: string, updatedAt: string): void {
  db.prepare(`UPDATE files SET name = ?, updated_at = ? WHERE file_id = ?`).run(name, updatedAt, fileId)
}

export function deleteFileById(db: Database, fileId: string): void {
  db.prepare(`DELETE FROM files WHERE file_id = ?`).run(fileId)
}

/** B-02 — 远端 file_meta 登记（待 pull） */
export function upsertRemoteFileMeta(db: Database, meta: FileMeta): boolean {
  const existing = getFileById(db, meta.fileId)
  if (existing) {
    if (existing.updatedAt >= meta.updatedAt) return false
    db.prepare(`DELETE FROM files WHERE file_id = ?`).run(meta.fileId)
  }
  insertFile(db, meta)
  return true
}
