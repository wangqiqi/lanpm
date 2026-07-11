import { describe, expect, it } from 'vitest'
import {
  isLocalRemovedPath,
  isRemotePendingPath,
  isFilePullRequestPayload,
  isPartialFilePath,
  filePullFromOffset,
  partialFileName,
  LOCAL_REMOVED_PREFIX,
  PARTIAL_FILE_SUFFIX,
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

describe('partial download path helpers', () => {
  it('builds and detects .partial names', () => {
    expect(partialFileName('file_abc')).toBe(`file_abc${PARTIAL_FILE_SUFFIX}`)
    expect(isPartialFilePath(`/data/g1/file_abc${PARTIAL_FILE_SUFFIX}`)).toBe(true)
    expect(isPartialFilePath('/data/g1/file_abc_name.txt')).toBe(false)
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
