import { describe, expect, it } from 'vitest'
import { isRemotePendingPath, REMOTE_PENDING_PREFIX } from '@shared/file/sync'

describe('isRemotePendingPath', () => {
  it('detects remote-pending storage paths', () => {
    expect(isRemotePendingPath(`${REMOTE_PENDING_PREFIX}file_abc`)).toBe(true)
    expect(isRemotePendingPath('/data/files/sample.txt')).toBe(false)
  })
})
