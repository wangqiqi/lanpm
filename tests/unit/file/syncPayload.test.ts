import { describe, expect, it } from 'vitest'
import {
  fileChunkBody,
  filePullChunkEncoding,
  isFileMetaSyncBatchPayload,
  isFileMetaSyncRequestPayload,
  isFilePullRequestPayload,
  splitFileMetaOfflineSyncPage
} from '../../../src/shared/file/sync.ts'
import {
  encodeFileChunkFrame,
  isFileChunkBinaryPayload,
  tryDecodeFileChunkFrame
} from '../../../src/shared/file/chunkFrame.ts'

describe('filePullRequest chunkEncoding', () => {
  it('accepts omitted encoding (legacy)', () => {
    expect(isFilePullRequestPayload({ fileId: 'f1', groupId: 'g1' })).toBe(true)
    expect(filePullChunkEncoding({ fileId: 'f1', groupId: 'g1' })).toBe('base64')
  })

  it('accepts binary and rejects junk', () => {
    expect(
      isFilePullRequestPayload({ fileId: 'f1', groupId: 'g1', chunkEncoding: 'binary' })
    ).toBe(true)
    expect(filePullChunkEncoding({ fileId: 'f1', groupId: 'g1', chunkEncoding: 'binary' })).toBe(
      'binary'
    )
    expect(
      isFilePullRequestPayload({ fileId: 'f1', groupId: 'g1', chunkEncoding: 'true' })
    ).toBe(false)
  })
})

describe('file chunk frame', () => {
  it('roundtrips header + raw bytes without base64', () => {
    const chunk = Buffer.from([0, 1, 2, 255])
    const payload = {
      fileId: 'f1',
      groupId: 'g1',
      offset: 0,
      totalBytes: 4,
      sha256: 'abc',
      done: true,
      chunk
    }
    expect(isFileChunkBinaryPayload(payload)).toBe(true)
    const framed = encodeFileChunkFrame(payload)
    expect(framed.includes(Buffer.from('chunkBase64'))).toBe(false)
    const decoded = tryDecodeFileChunkFrame(framed)
    expect(decoded?.chunk.equals(chunk)).toBe(true)
    expect(decoded?.fileId).toBe('f1')
    expect(decoded?.done).toBe(true)
  })

  it('does not treat JSON payloads as frames', () => {
    expect(tryDecodeFileChunkFrame(Buffer.from('{"fileId":"f1"}', 'utf8'))).toBeNull()
  })
})

describe('fileChunkBody', () => {
  it('reads Base64 or Buffer', () => {
    expect(
      fileChunkBody({ chunkBase64: Buffer.from('ab').toString('base64') })?.equals(Buffer.from('ab'))
    ).toBe(true)
    expect(fileChunkBody({ chunk: Buffer.from('cd') })?.equals(Buffer.from('cd'))).toBe(true)
    expect(fileChunkBody({})).toBeNull()
  })
})

describe('file meta offline sync payloads (TASK-4801)', () => {
  it('accepts request with exclusive since + min cutoff', () => {
    expect(
      isFileMetaSyncRequestPayload({
        sinceUpdatedAt: '2026-08-01T00:00:00.000Z',
        minUpdatedAt: '2026-08-13T00:00:00.000Z'
      })
    ).toBe(true)
    expect(isFileMetaSyncRequestPayload({ sinceUpdatedAt: '', minUpdatedAt: 'x' })).toBe(true)
    expect(isFileMetaSyncRequestPayload({ sinceUpdatedAt: 'a' })).toBe(false)
    expect(isFileMetaSyncRequestPayload({ minUpdatedAt: '' })).toBe(false)
  })

  it('pages by LIMIT and reports hasMore', () => {
    const base = {
      fileId: 'f',
      groupId: 'g1',
      name: 'a.txt',
      ext: 'txt',
      category: 'other' as const,
      size: 1,
      uploadedBy: 'u',
      uploadedAt: '2026-08-20T00:00:00.000Z',
      sha256: 'ab',
      storagePath: 'remote-pending:f',
      previewStatus: 'none' as const,
      isBookmark: false,
      updatedAt: '2026-08-20T00:00:00.000Z'
    }
    const rows = [
      { ...base, fileId: 'f1', updatedAt: '2026-08-20T00:00:00.000Z' },
      { ...base, fileId: 'f2', updatedAt: '2026-08-20T00:01:00.000Z' },
      { ...base, fileId: 'f3', updatedAt: '2026-08-20T00:02:00.000Z' }
    ]
    expect(splitFileMetaOfflineSyncPage(rows, 2)).toEqual({
      files: rows.slice(0, 2),
      hasMore: true
    })
    expect(isFileMetaSyncBatchPayload({ files: rows, hasMore: false })).toBe(true)
    expect(isFileMetaSyncBatchPayload({ files: 'nope' })).toBe(false)
  })
})
