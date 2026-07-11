import { describe, expect, it } from 'vitest'
import {
  isWhiteboardCrdtPayload,
  isWhiteboardCrdtSyncBatchPayload,
  isWhiteboardCrdtSyncRequestPayload,
  whiteboardCrdtDocId,
  whiteboardCrdtDocIdMatchesGroup
} from '../../../src/shared/whiteboard/whiteboardCrdt'
import {
  isWhiteboardAwarenessLocalState,
  isWhiteboardAwarenessPayload
} from '../../../src/shared/whiteboard/whiteboardAwareness'

describe('whiteboardCrdt protocol', () => {
  const valid = {
    docId: 'whiteboard:g1',
    updateBase64: Buffer.from([0, 1, 2]).toString('base64')
  }

  it('builds canonical docId', () => {
    expect(whiteboardCrdtDocId('abc')).toBe('whiteboard:abc')
    expect(whiteboardCrdtDocIdMatchesGroup('whiteboard:abc', 'abc')).toBe(true)
    expect(whiteboardCrdtDocIdMatchesGroup('whiteboard:abc', 'other')).toBe(false)
  })

  it('accepts valid WhiteboardCrdtPayload', () => {
    expect(isWhiteboardCrdtPayload(valid)).toBe(true)
  })

  it('validates offline sync request/batch payloads', () => {
    expect(
      isWhiteboardCrdtSyncRequestPayload({ docId: 'whiteboard:g1', stateVectorBase64: '' })
    ).toBe(true)
    expect(
      isWhiteboardCrdtSyncRequestPayload({
        docId: 'whiteboard:g1',
        stateVectorBase64: Buffer.from([1, 2]).toString('base64')
      })
    ).toBe(true)
    expect(
      isWhiteboardCrdtSyncRequestPayload({ docId: 'task:g1', stateVectorBase64: '' })
    ).toBe(false)
    expect(
      isWhiteboardCrdtSyncBatchPayload({
        docId: 'whiteboard:g1',
        updateBase64: valid.updateBase64
      })
    ).toBe(true)
    expect(
      isWhiteboardCrdtSyncBatchPayload({ docId: 'whiteboard:g1', updateBase64: '' })
    ).toBe(false)
  })

  it('rejects invalid shapes', () => {
    expect(isWhiteboardCrdtPayload(null)).toBe(false)
    expect(isWhiteboardCrdtPayload({ ...valid, docId: 'task:g1' })).toBe(false)
    expect(isWhiteboardCrdtPayload({ ...valid, docId: 'whiteboard:' })).toBe(false)
    expect(isWhiteboardCrdtPayload({ ...valid, updateBase64: '' })).toBe(false)
    expect(isWhiteboardCrdtPayload({ ...valid, updateBase64: 'not base64!!!' })).toBe(false)
  })

  it('validates awareness payload + local state', () => {
    expect(
      isWhiteboardAwarenessPayload({
        docId: 'whiteboard:g1',
        updateBase64: valid.updateBase64
      })
    ).toBe(true)
    expect(
      isWhiteboardAwarenessLocalState({
        user: { name: 'A', color: '#fff', colorLight: '#fff3' }
      })
    ).toBe(true)
    expect(isWhiteboardAwarenessLocalState({ user: { name: '' } })).toBe(false)
  })
})
