import { describe, expect, it } from 'vitest'
import {
  isTaskAwarenessLocalState,
  isTaskAwarenessPayload,
  taskAwarenessDocId,
  taskAwarenessDocIdMatchesGroup,
  taskAwarenessPayloadFromUpdate
} from '../../../src/shared/task/taskAwareness'

describe('taskAwareness protocol', () => {
  const validPayload = {
    docId: 'task:g1',
    updateBase64: Buffer.from([0, 1, 2]).toString('base64')
  }

  const validLocal = {
    userId: 'u1',
    displayName: 'Alice',
    focusedTaskId: 't1',
    view: 'board' as const
  }

  it('reuses task:{groupId} docId', () => {
    expect(taskAwarenessDocId('abc')).toBe('task:abc')
    expect(taskAwarenessDocIdMatchesGroup('task:abc', 'abc')).toBe(true)
    expect(taskAwarenessDocIdMatchesGroup('task:abc', 'other')).toBe(false)
  })

  it('accepts valid TaskAwarenessPayload', () => {
    expect(isTaskAwarenessPayload(validPayload)).toBe(true)
  })

  it('rejects invalid payloads', () => {
    expect(isTaskAwarenessPayload(null)).toBe(false)
    expect(isTaskAwarenessPayload({ ...validPayload, docId: 'wrong' })).toBe(false)
    expect(isTaskAwarenessPayload({ ...validPayload, updateBase64: '' })).toBe(false)
    expect(isTaskAwarenessPayload({ ...validPayload, updateBase64: '!!!' })).toBe(false)
  })

  it('accepts valid local focus state', () => {
    expect(isTaskAwarenessLocalState(validLocal)).toBe(true)
    expect(
      isTaskAwarenessLocalState({ ...validLocal, focusedTaskId: null, view: 'tree' })
    ).toBe(true)
    expect(isTaskAwarenessLocalState({ ...validLocal, view: null, focusedTaskId: undefined })).toBe(
      true
    )
  })

  it('accepts local state with description caret', () => {
    expect(
      isTaskAwarenessLocalState({
        ...validLocal,
        caret: { field: 'description', offset: 12 }
      })
    ).toBe(true)
    expect(isTaskAwarenessLocalState({ ...validLocal, caret: null })).toBe(true)
  })

  it('rejects invalid caret', () => {
    expect(
      isTaskAwarenessLocalState({
        ...validLocal,
        caret: { field: 'title', offset: 0 }
      })
    ).toBe(false)
    expect(
      isTaskAwarenessLocalState({
        ...validLocal,
        caret: { field: 'description', offset: -1 }
      })
    ).toBe(false)
  })

  it('rejects invalid local state', () => {
    expect(isTaskAwarenessLocalState(null)).toBe(false)
    expect(isTaskAwarenessLocalState({ ...validLocal, userId: '' })).toBe(false)
    expect(isTaskAwarenessLocalState({ ...validLocal, view: 'gantt' })).toBe(false)
    expect(isTaskAwarenessLocalState({ ...validLocal, focusedTaskId: 1 })).toBe(false)
  })

  it('builds payload from update bytes', () => {
    const p = taskAwarenessPayloadFromUpdate('g1', new Uint8Array([9, 8]))
    expect(p.docId).toBe('task:g1')
    expect(isTaskAwarenessPayload(p)).toBe(true)
  })
})
