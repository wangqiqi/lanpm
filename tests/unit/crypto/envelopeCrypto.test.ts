import { describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { openEnvelope, openSealedBytes, sealEnvelope, sealEnvelopeParts } from '../../../src/main/crypto/envelopeCrypto.ts'
import type { SyncEnvelope } from '../../../src/shared/network/types.ts'

const aes = randomBytes(32)

const base: SyncEnvelope = {
  version: 1,
  type: 'chat',
  msgId: 'msg_1',
  senderUserId: 'u1',
  senderDeviceId: 'd1',
  groupId: 'demo-project',
  ts: '2026-01-01T00:00:00.000Z',
  payload: { text: 'hi' },
  nonce: '',
  authTag: ''
}

describe('openEnvelope', () => {
  it('roundtrips framed file_chunk without chunkBase64 in plaintext JSON', () => {
    const chunk = Buffer.alloc(256, 7)
    const env: SyncEnvelope = {
      ...base,
      type: 'file_chunk',
      payload: {
        fileId: 'f1',
        groupId: 'demo-project',
        offset: 0,
        totalBytes: chunk.length,
        sha256: 'deadbeef',
        done: true,
        chunk
      }
    }
    const sealed = sealEnvelope(aes, env)
    const enc = (sealed.payload as { __enc: string }).__enc
    const cipher = Buffer.from(enc, 'base64')
    expect(cipher.includes(Buffer.from('chunkBase64'))).toBe(false)
    const opened = openEnvelope(aes, sealed)
    const p = opened.payload as { chunk: Buffer; chunkBase64?: string; fileId: string }
    expect(p.fileId).toBe('f1')
    expect(p.chunkBase64).toBeUndefined()
    expect(Buffer.isBuffer(p.chunk)).toBe(true)
    expect(p.chunk.equals(chunk)).toBe(true)
  })

  it('rejects unsealed envelopes (fail-closed)', () => {
    expect(() => openEnvelope(aes, base)).toThrow(/not sealed/)
  })

  it('rejects missing nonce or authTag', () => {
    const sealed = sealEnvelope(aes, base)
    expect(() => openEnvelope(aes, { ...sealed, nonce: '' })).toThrow(/not sealed/)
    expect(() => openEnvelope(aes, { ...sealed, authTag: '' })).toThrow(/not sealed/)
  })

  it('opens raw ciphertext Buffer without JSON __enc (TASK-4202)', () => {
    const { meta, ciphertext } = sealEnvelopeParts(aes, base)
    expect(Buffer.isBuffer(ciphertext)).toBe(true)
    const viaPayload = openEnvelope(aes, { ...meta, payload: ciphertext })
    expect(viaPayload.payload).toEqual({ text: 'hi' })
    const viaParts = openSealedBytes(aes, meta, ciphertext)
    expect(viaParts.payload).toEqual({ text: 'hi' })
  })
})
