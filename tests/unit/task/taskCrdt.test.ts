import { describe, expect, it } from 'vitest'
import {
  isTaskCrdtPayload,
  isTaskCrdtSyncBatchPayload,
  isTaskCrdtSyncRequestPayload,
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

  it('validates offline sync request/batch payloads', () => {
    expect(
      isTaskCrdtSyncRequestPayload({ docId: 'task:g1', stateVectorBase64: '' })
    ).toBe(true)
    expect(
      isTaskCrdtSyncRequestPayload({
        docId: 'task:g1',
        stateVectorBase64: Buffer.from([1, 2]).toString('base64')
      })
    ).toBe(true)
    expect(
      isTaskCrdtSyncRequestPayload({ docId: 'bad', stateVectorBase64: '' })
    ).toBe(false)
    expect(
      isTaskCrdtSyncBatchPayload({
        docId: 'task:g1',
        updateBase64: valid.updateBase64
      })
    ).toBe(true)
    expect(
      isTaskCrdtSyncBatchPayload({ docId: 'task:g1', updateBase64: '' })
    ).toBe(false)
  })

  it('rejects invalid shapes', () => {
    expect(isTaskCrdtPayload(null)).toBe(false)
    expect(isTaskCrdtPayload({ ...valid, docId: 'wrong' })).toBe(false)
    expect(isTaskCrdtPayload({ ...valid, docId: 'task:' })).toBe(false)
    expect(isTaskCrdtPayload({ ...valid, updateBase64: '' })).toBe(false)
    expect(isTaskCrdtPayload({ ...valid, updateBase64: 'not base64!!!' })).toBe(false)
  })
})
