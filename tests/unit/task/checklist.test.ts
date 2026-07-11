import { describe, expect, it } from 'vitest'
import { checklistProgressOf, type ChecklistItem } from '@shared/task/checklist'
import { TASK_IPC } from '@shared/task/channels'

function item(partial: Partial<ChecklistItem> & Pick<ChecklistItem, 'itemId' | 'done'>): ChecklistItem {
  return {
    checklistId: 'cl1',
    taskId: 't1',
    text: 'x',
    sortOrder: 0,
    createdAt: '2026-07-11T00:00:00Z',
    updatedAt: '2026-07-11T00:00:00Z',
    ...partial
  }
}

describe('checklistProgressOf', () => {
  it('returns 0/0 for empty', () => {
    expect(checklistProgressOf([])).toEqual({ done: 0, total: 0 })
  })

  it('counts done items', () => {
    expect(
      checklistProgressOf([
        item({ itemId: 'a', done: true }),
        item({ itemId: 'b', done: false }),
        item({ itemId: 'c', done: true })
      ])
    ).toEqual({ done: 2, total: 3 })
  })
})

describe('TASK_IPC checklist channels', () => {
  it('exposes list/upsert/toggle/remove', () => {
    expect(TASK_IPC.listChecklist).toBe('task:listChecklist')
    expect(TASK_IPC.upsertChecklistItem).toBe('task:upsertChecklistItem')
    expect(TASK_IPC.toggleChecklistItem).toBe('task:toggleChecklistItem')
    expect(TASK_IPC.removeChecklistItem).toBe('task:removeChecklistItem')
  })
})
