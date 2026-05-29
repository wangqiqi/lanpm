import { describe, expect, it } from 'vitest'
import {
  isKanbanTrashDropId,
  isTaskStatus,
  KANBAN_COLUMN_ORDER,
  KANBAN_TRASH_DROP_ID
} from '@shared/task/kanban'

describe('isTaskStatus', () => {
  it('accepts known column statuses', () => {
    for (const status of KANBAN_COLUMN_ORDER) {
      expect(isTaskStatus(status)).toBe(true)
    }
  })

  it('rejects unknown values', () => {
    expect(isTaskStatus('archived')).toBe(false)
  })
})

describe('isKanbanTrashDropId', () => {
  it('matches trash droppable id', () => {
    expect(isKanbanTrashDropId(KANBAN_TRASH_DROP_ID)).toBe(true)
    expect(isKanbanTrashDropId('todo')).toBe(false)
  })
})
