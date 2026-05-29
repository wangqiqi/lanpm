import { describe, expect, it } from 'vitest'
import {
  isLocalRemovedPath,
  isRemotePendingPath,
  LOCAL_REMOVED_PREFIX,
  REMOTE_PENDING_PREFIX
} from '@shared/file/sync'

describe('isRemotePendingPath', () => {
  it('detects remote-pending storage paths', () => {
    expect(isRemotePendingPath(`${REMOTE_PENDING_PREFIX}file_abc`)).toBe(true)
    expect(isRemotePendingPath('/data/files/sample.txt')).toBe(false)
  })
})

describe('isLocalRemovedPath', () => {
  it('detects local-removed storage paths', () => {
    expect(isLocalRemovedPath(`${LOCAL_REMOVED_PREFIX}file_abc`)).toBe(true)
    expect(isLocalRemovedPath('/data/files/sample.txt')).toBe(false)
  })
})
