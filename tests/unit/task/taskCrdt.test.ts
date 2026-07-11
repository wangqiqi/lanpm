import { describe, expect, it } from 'vitest'
import {
  isTaskCrdtPayload,
  taskCrdtDocId,
  taskCrdtDocIdMatchesGroup
} from '../../../src/shared/task/taskCrdt'

describe('taskCrdt protocol', () => {
  const valid = {
    docId: 'task:g1',
    updateBase64: Buffer.from([0, 1, 2]).toString('base64')
  }

  it('builds canonical docId', () => {
    expect(taskCrdtDocId('abc')).toBe('task:abc')
    expect(taskCrdtDocIdMatchesGroup('task:abc', 'abc')).toBe(true)
    expect(taskCrdtDocIdMatchesGroup('task:abc', 'other')).toBe(false)
  })

  it('accepts valid TaskCrdtPayload', () => {
    expect(isTaskCrdtPayload(valid)).toBe(true)
  })

  it('rejects invalid shapes', () => {
    expect(isTaskCrdtPayload(null)).toBe(false)
    expect(isTaskCrdtPayload({ ...valid, docId: 'wrong' })).toBe(false)
    expect(isTaskCrdtPayload({ ...valid, docId: 'task:' })).toBe(false)
    expect(isTaskCrdtPayload({ ...valid, updateBase64: '' })).toBe(false)
    expect(isTaskCrdtPayload({ ...valid, updateBase64: 'not base64!!!' })).toBe(false)
  })
})
