import { describe, expect, it } from 'vitest'
import { randomBytes } from 'node:crypto'
import { openEnvelope, sealEnvelope } from '../../../src/main/crypto/envelopeCrypto.ts'
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
  it('roundtrips sealed payloads', () => {
    const sealed = sealEnvelope(aes, base)
    expect(openEnvelope(aes, sealed).payload).toEqual(base.payload)
  })

  it('rejects unsealed envelopes (fail-closed)', () => {
    expect(() => openEnvelope(aes, base)).toThrow(/not sealed/)
  })

  it('rejects missing nonce or authTag', () => {
    const sealed = sealEnvelope(aes, base)
    expect(() => openEnvelope(aes, { ...sealed, nonce: '' })).toThrow(/not sealed/)
    expect(() => openEnvelope(aes, { ...sealed, authTag: '' })).toThrow(/not sealed/)
  })
})
