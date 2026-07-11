import { describe, expect, it } from 'vitest'
import { applyLibraryFilters } from '../../../src/renderer/src/features/files/fileListModel'
import type { FileMeta } from '@shared/file/types'
import { buildDeliverableIndex } from '@shared/task/deliverables'

function meta(fileId: string): FileMeta {
  return {
    fileId,
    groupId: 'g1',
    name: fileId,
    ext: 'txt',
    category: 'other',
    size: 1,
    uploadedBy: 'u',
    uploadedAt: '2026-01-01T00:00:00.000Z',
    sha256: 'x',
    storagePath: '/tmp/' + fileId,
    previewStatus: 'none',
    isBookmark: false,
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

describe('applyLibraryFilters', () => {
  const files = [meta('f1'), meta('f2'), meta('f3')]
  const idx = buildDeliverableIndex([
    { taskId: 't1', title: 'A', linkedFileIds: ['f1', 'f2'] }
  ])

  it('keeps all when scope=all', () => {
    expect(
      applyLibraryFilters(files, {
        scope: 'all',
        taskId: null,
        fileToTaskIds: idx.fileToTaskIds,
        taskToFileIds: idx.taskToFileIds
      }).map((f) => f.fileId)
    ).toEqual(['f1', 'f2', 'f3'])
  })

  it('filters deliverables and by task', () => {
    expect(
      applyLibraryFilters(files, {
        scope: 'deliverables',
        taskId: null,
        fileToTaskIds: idx.fileToTaskIds,
        taskToFileIds: idx.taskToFileIds
      }).map((f) => f.fileId)
    ).toEqual(['f1', 'f2'])
    expect(
      applyLibraryFilters(files, {
        scope: 'all',
        taskId: 't1',
        fileToTaskIds: idx.fileToTaskIds,
        taskToFileIds: idx.taskToFileIds
      }).map((f) => f.fileId)
    ).toEqual(['f1', 'f2'])
  })
})
