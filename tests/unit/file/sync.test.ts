import { describe, expect, it } from 'vitest'
import {
  isLocalRemovedPath,
  isRemotePendingPath,
  isFilePullRequestPayload,
  filePullFromOffset,
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

describe('isFilePullRequestPayload', () => {
  it('accepts legacy payload without fromOffset', () => {
    expect(isFilePullRequestPayload({ fileId: 'f1', groupId: 'g1' })).toBe(true)
    expect(filePullFromOffset({ fileId: 'f1', groupId: 'g1' })).toBe(0)
  })

  it('accepts fromOffset resume', () => {
    expect(
      isFilePullRequestPayload({ fileId: 'f1', groupId: 'g1', fromOffset: 262144 })
    ).toBe(true)
    expect(filePullFromOffset({ fileId: 'f1', groupId: 'g1', fromOffset: 100 })).toBe(100)
  })

  it('rejects invalid fromOffset', () => {
    expect(isFilePullRequestPayload({ fileId: 'f1', groupId: 'g1', fromOffset: -1 })).toBe(false)
    expect(isFilePullRequestPayload({ fileId: 'f1', groupId: 'g1', fromOffset: 1.5 })).toBe(false)
    expect(isFilePullRequestPayload({ fileId: '', groupId: 'g1' })).toBe(false)
  })
})
