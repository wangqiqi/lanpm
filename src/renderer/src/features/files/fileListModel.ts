import type { FileMeta } from '@shared/file/types'
import {
  filterDeliverableFiles,
  filterFilesByTaskId
} from '@shared/task/deliverables'
import type { MessageKey } from '@renderer/i18n/messages'

export type FileSortField = 'name' | 'type' | 'size' | 'uploadedAt'
export type FileSortOrder = 'ascend' | 'descend'
/** 全部群文件 vs 已挂任务的交付物（A3） */
export type FileLibraryScope = 'all' | 'deliverables'

export function filterFiles(files: FileMeta[], query: string): FileMeta[] {
  const q = query.trim().toLowerCase()
  if (!q) return files
  return files.filter((f) => {
    if (f.name.toLowerCase().includes(q)) return true
    if (f.ext.toLowerCase().includes(q)) return true
    if (f.bookmarkTitle?.toLowerCase().includes(q)) return true
    if (f.bookmarkUrl?.toLowerCase().includes(q)) return true
    return false
  })
}

/** Apply A3 library scope + optional task filter (before text search). */
export function applyLibraryFilters(
  files: FileMeta[],
  opts: {
    scope: FileLibraryScope
    taskId: string | null
    fileToTaskIds: Map<string, string[]>
    taskToFileIds: Map<string, string[]>
  }
): FileMeta[] {
  let list = files
  if (opts.scope === 'deliverables') {
    list = filterDeliverableFiles(list, opts.fileToTaskIds)
  }
  if (opts.taskId) {
    list = filterFilesByTaskId(list, opts.taskId, opts.taskToFileIds)
  }
  return list
}

export function formatFileUploadedAt(iso: string, locale: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

export const CATEGORY_I18N_KEYS: Record<
  'document' | 'image' | 'video' | 'code' | 'bookmark' | 'other',
  MessageKey
> = {
  document: 'files.categoryDocument',
  image: 'files.categoryImage',
  video: 'files.categoryVideo',
  code: 'files.categoryCode',
  bookmark: 'files.categoryBookmark',
  other: 'files.categoryOther'
}
