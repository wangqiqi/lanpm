import { describe, expect, it } from 'vitest'
import {
  filePullChunkEncoding,
  isFilePullRequestPayload
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
