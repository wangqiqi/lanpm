import { describe, expect, it } from 'vitest'
import {
  buildDeliverableIndex,
  filterDeliverableFiles,
  filterFilesByTaskId,
  isDeliverableFile,
  tasksForFile,
  type TaskDeliverableSource
} from '@shared/task/deliverables'

function task(
  partial: Partial<TaskDeliverableSource> & Pick<TaskDeliverableSource, 'taskId' | 'title'>
): TaskDeliverableSource {
  return {
    linkedFileIds: partial.linkedFileIds,
    deletedAt: partial.deletedAt,
    taskId: partial.taskId,
    title: partial.title
  }
}

describe('buildDeliverableIndex', () => {
  it('indexes file→tasks and task→files', () => {
    const idx = buildDeliverableIndex([
      task({ taskId: 't1', title: 'Alpha', linkedFileIds: ['f1', 'f2'] }),
      task({ taskId: 't2', title: 'Beta', linkedFileIds: ['f2'] })
    ])
    expect(idx.taskToFileIds.get('t1')).toEqual(['f1', 'f2'])
    expect(idx.taskToFileIds.get('t2')).toEqual(['f2'])
    expect(idx.fileToTaskIds.get('f1')).toEqual(['t1'])
    expect(idx.fileToTaskIds.get('f2')).toEqual(['t1', 't2'])
    expect(tasksForFile('f2', idx.fileToTasks)).toEqual([
      { taskId: 't1', title: 'Alpha' },
      { taskId: 't2', title: 'Beta' }
    ])
  })

  it('skips soft-deleted tasks and normalizes ids', () => {
    const idx = buildDeliverableIndex([
      task({ taskId: 't1', title: 'Live', linkedFileIds: [' f1 ', 'f1', ''] }),
      task({
        taskId: 't2',
        title: 'Gone',
        linkedFileIds: ['f1'],
        deletedAt: '2026-01-01T00:00:00.000Z'
      })
    ])
    expect(idx.taskToFileIds.has('t2')).toBe(false)
    expect(idx.fileToTaskIds.get('f1')).toEqual(['t1'])
  })
})

describe('filterDeliverableFiles / filterFilesByTaskId', () => {
  const files = [{ fileId: 'f1' }, { fileId: 'f2' }, { fileId: 'f3' }]
  const idx = buildDeliverableIndex([
    task({ taskId: 't1', title: 'A', linkedFileIds: ['f1', 'f2'] })
  ])

  it('marks and filters deliverables', () => {
    expect(isDeliverableFile('f1', idx.fileToTaskIds)).toBe(true)
    expect(isDeliverableFile('f3', idx.fileToTaskIds)).toBe(false)
    expect(filterDeliverableFiles(files, idx.fileToTaskIds).map((f) => f.fileId)).toEqual([
      'f1',
      'f2'
    ])
  })

  it('filters by task id', () => {
    expect(filterFilesByTaskId(files, 't1', idx.taskToFileIds).map((f) => f.fileId)).toEqual([
      'f1',
      'f2'
    ])
    expect(filterFilesByTaskId(files, 'missing', idx.taskToFileIds)).toEqual([])
  })
})
