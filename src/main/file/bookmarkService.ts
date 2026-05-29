import { createHash, randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { readFileSync, writeFileSync } from 'fs'
import type { BrowserWindow } from 'electron'
import type { BookmarkEntry } from '../../shared/file/bookmarks'
import { exportBookmarkHtml, parseBookmarkHtml } from '../../shared/file/bookmarks'
import type { FileMeta } from '../../shared/file/types'
import { getSetupStatus } from '../identity/setup'
import { getFileById, insertFile, listFilesByGroup } from '../storage/repositories/fileRepository'
import { assertFileWritable } from './fileServiceHelpers'
import { showOpenDialog, showSaveDialog } from '../systemDialog'

export function createBookmark(
  db: Database,
  groupId: string,
  url: string,
  title: string
): FileMeta {
  assertFileWritable(db, groupId)
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) throw new Error('请先完成身份配置')

  const trimmedUrl = url.trim()
  const trimmedTitle = title.trim() || trimmedUrl
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    throw new Error('书签 URL 须以 http:// 或 https:// 开头')
  }

  const fileId = `file_${randomUUID()}`
  const now = new Date().toISOString()
  const meta: FileMeta = {
    fileId,
    groupId,
    name: trimmedTitle,
    ext: 'url',
    category: 'bookmark',
    size: 0,
    uploadedBy: status.user.userId,
    uploadedAt: now,
    sha256: createHash('sha256').update(trimmedUrl).digest('hex'),
    storagePath: '',
    previewStatus: 'ready',
    isBookmark: true,
    bookmarkUrl: trimmedUrl,
    bookmarkTitle: trimmedTitle,
    updatedAt: now
  }
  insertFile(db, meta)
  return getFileById(db, fileId)!
}

export function importBookmarksFromHtml(
  db: Database,
  groupId: string,
  html: string
): FileMeta[] {
  const entries = parseBookmarkHtml(html)
  if (entries.length === 0) throw new Error('未解析到有效书签链接')
  return entries.map((e) => createBookmark(db, groupId, e.url, e.title))
}

export async function pickAndImportBookmarks(
  db: Database,
  groupId: string,
  parent?: BrowserWindow | null
): Promise<FileMeta[]> {
  const result = await showOpenDialog(parent, {
    properties: ['openFile'],
    filters: [{ name: 'HTML 书签', extensions: ['html', 'htm'] }]
  })
  if (result.canceled || !result.filePaths[0]) return []
  const html = readFileSync(result.filePaths[0], 'utf8')
  return importBookmarksFromHtml(db, groupId, html)
}

export async function exportGroupBookmarks(
  db: Database,
  groupId: string,
  parent?: BrowserWindow | null
): Promise<string | null> {
  const bookmarks = listFilesByGroup(db, groupId, 'bookmark').filter((f) => f.isBookmark)
  if (bookmarks.length === 0) throw new Error('当前群组没有书签可导出')

  const entries: BookmarkEntry[] = bookmarks.map((b) => ({
    url: b.bookmarkUrl ?? '',
    title: b.bookmarkTitle ?? b.name
  }))
  const html = exportBookmarkHtml(entries, `LanPM-${groupId}`)

  const result = await showSaveDialog(parent, {
    defaultPath: `lanpm-bookmarks-${groupId}.html`,
    filters: [{ name: 'HTML 书签', extensions: ['html'] }]
  })
  if (result.canceled || !result.filePath) return null
  writeFileSync(result.filePath, html, 'utf8')
  return result.filePath
}
