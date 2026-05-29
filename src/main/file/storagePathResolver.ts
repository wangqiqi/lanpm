import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { Database } from 'better-sqlite3'
import type { FileMeta } from '../../shared/file/types'
import { isLocalRemovedPath, isRemotePendingPath } from '../../shared/file/sync'

function getUserDataPath(): string {
  if (process.env.LANPM_USER_DATA) return process.env.LANPM_USER_DATA
  return app.getPath('userData')
}

export function filesRootDir(): string {
  return join(getUserDataPath(), 'files')
}

export function canonicalStoragePath(meta: Pick<FileMeta, 'fileId' | 'groupId' | 'name'>): string {
  return join(filesRootDir(), meta.groupId, `${meta.fileId}_${meta.name}`)
}

/** 解析磁盘路径：DB 记录优先，profile 迁移后回退 canonical 路径 */
export function resolveFileDiskPath(
  meta: Pick<FileMeta, 'fileId' | 'groupId' | 'name' | 'storagePath' | 'isBookmark'>
): string | null {
  if (meta.isBookmark) return null
  if (isRemotePendingPath(meta.storagePath) || isLocalRemovedPath(meta.storagePath)) return null

  if (existsSync(meta.storagePath)) return meta.storagePath

  const canonical = canonicalStoragePath(meta)
  if (existsSync(canonical)) return canonical

  return null
}

export function resolvePreviewDiskPath(
  meta: Pick<
    FileMeta,
    'fileId' | 'groupId' | 'name' | 'storagePath' | 'previewStatus' | 'previewPath' | 'isBookmark'
  >
): string | null {
  if (meta.isBookmark) return null
  if (isRemotePendingPath(meta.storagePath) || isLocalRemovedPath(meta.storagePath)) return null

  if (meta.previewStatus === 'ready' && meta.previewPath && existsSync(meta.previewPath)) {
    return meta.previewPath
  }

  return resolveFileDiskPath(meta)
}

/** 启动时修复 profile 迁移后 storage_path / preview_path 仍指向旧 userData 的记录 */
export function repairFileStoragePaths(db: Database): number {
  const rows = db
    .prepare(
      `SELECT file_id, group_id, name, storage_path, preview_path, preview_status
       FROM files WHERE is_bookmark = 0`
    )
    .all() as {
    file_id: string
    group_id: string
    name: string
    storage_path: string
    preview_path: string | null
    preview_status: string
  }[]

  const now = new Date().toISOString()
  let fixed = 0

  for (const row of rows) {
    if (isRemotePendingPath(row.storage_path) || isLocalRemovedPath(row.storage_path)) continue

    const meta = {
      fileId: row.file_id,
      groupId: row.group_id,
      name: row.name,
      storagePath: row.storage_path,
      previewStatus: row.preview_status as FileMeta['previewStatus'],
      previewPath: row.preview_path ?? undefined,
      isBookmark: false
    }

    const diskPath = resolveFileDiskPath(meta)
    if (!diskPath) continue

    const storageChanged = diskPath !== row.storage_path
    let previewPath = row.preview_path
    let previewChanged = false

    if (row.preview_status === 'ready') {
      const resolvedPreview = resolvePreviewDiskPath({ ...meta, previewPath: row.preview_path ?? undefined })
      if (resolvedPreview && resolvedPreview !== row.preview_path) {
        previewPath = resolvedPreview
        previewChanged = true
      } else if (!previewPath || !existsSync(previewPath)) {
        previewPath = diskPath
        previewChanged = true
      }
    }

    if (!storageChanged && !previewChanged) continue

    db.prepare(
      `UPDATE files SET storage_path = ?, preview_path = ?, updated_at = ? WHERE file_id = ?`
    ).run(diskPath, previewPath, now, row.file_id)
    fixed++
  }

  return fixed
}
