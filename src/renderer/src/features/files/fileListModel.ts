import type { FileMeta } from '@shared/file/types'
import { formatFileTypeLabel } from '@shared/file/formatFileType'
import type { MessageKey } from '@renderer/i18n/messages'

export type FileSortField = 'name' | 'type' | 'size' | 'uploadedAt'
export type FileSortOrder = 'ascend' | 'descend'

type CategoryLabels = Record<
  'document' | 'image' | 'video' | 'code' | 'bookmark' | 'other',
  string
>

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

export function sortFiles(
  files: FileMeta[],
  field: FileSortField,
  order: FileSortOrder,
  categoryLabels: CategoryLabels
): FileMeta[] {
  const dir = order === 'ascend' ? 1 : -1
  const list = [...files]
  list.sort((a, b) => {
    let cmp = 0
    switch (field) {
      case 'name':
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        break
      case 'type':
        cmp = formatFileTypeLabel(a, categoryLabels).localeCompare(
          formatFileTypeLabel(b, categoryLabels),
          undefined,
          { sensitivity: 'base' }
        )
        break
      case 'size':
        cmp = a.size - b.size
        break
      case 'uploadedAt':
        cmp = a.uploadedAt.localeCompare(b.uploadedAt)
        break
      default:
        cmp = 0
    }
    return cmp * dir
  })
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
