import { describe, expect, it } from 'vitest'
import {
  TASK_OFFLINE_SYNC_BATCH_LIMIT,
  maxIsoTimestamp,
  splitTaskOfflineSyncPage
} from '../../../src/shared/task/offlineSync.ts'

describe('task offline sync helpers', () => {
  it('uses a 100-item page size', () => {
    expect(TASK_OFFLINE_SYNC_BATCH_LIMIT).toBe(100)
  })

  it('splits pages with hasMore', () => {
    const rows = Array.from({ length: 105 }, (_, i) => i)
    const { items, hasMore } = splitTaskOfflineSyncPage(rows)
    expect(items).toHaveLength(100)
    expect(hasMore).toBe(true)
  })

  it('picks max ISO timestamp', () => {
    expect(maxIsoTimestamp('2020-01-01T00:00:00.000Z', '2021-01-01T00:00:00.000Z')).toBe(
      '2021-01-01T00:00:00.000Z'
    )
  })
})
