import { describe, expect, it } from 'vitest'
import {
  isMessageReadByOthers,
  isReadReceiptSyncBatchPayload,
  isReadReceiptSyncRequestPayload
} from '@shared/chat/readReceipt'

describe('isMessageReadByOthers', () => {
  it('returns true when a non-sender has read', () => {
    expect(isMessageReadByOthers('alice', ['alice', 'bob'])).toBe(true)
  })

  it('returns false when only sender has read', () => {
    expect(isMessageReadByOthers('alice', ['alice'])).toBe(false)
  })

  it('returns false for empty readers', () => {
    expect(isMessageReadByOthers('alice', [])).toBe(false)
  })
})

describe('read_receipt offline sync payloads (TASK-151)', () => {
  it('accepts valid request payload', () => {
    expect(
      isReadReceiptSyncRequestPayload({
        sinceReadAt: '',
        minReadAt: '2026-07-01T00:00:00.000Z'
      })
    ).toBe(true)
  })

  it('rejects request missing minReadAt', () => {
    expect(isReadReceiptSyncRequestPayload({ sinceReadAt: '' })).toBe(false)
  })

  it('accepts batch with receipts and hasMore', () => {
    expect(
      isReadReceiptSyncBatchPayload({
        receipts: [
          {
            msgId: 'm1',
            groupId: 'g1',
            readerUserId: 'u2',
            readerDeviceId: 'd2',
            readAt: '2026-07-01T01:00:00.000Z'
          }
        ],
        hasMore: false
      })
    ).toBe(true)
  })

  it('rejects batch with invalid receipt', () => {
    expect(
      isReadReceiptSyncBatchPayload({
        receipts: [{ msgId: 'm1' }]
      })
    ).toBe(false)
  })
})
