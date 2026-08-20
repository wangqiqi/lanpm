import { describe, expect, it } from 'vitest'
import {
  createWireDecoder,
  encodeWire,
  peerAcceptsEnvelopeBin,
  shouldSendEnvelopeBin,
  type WireEnvelopeBin
} from '../../../src/main/network/real/wireProtocol.ts'
import type { SyncEnvelope } from '../../../src/shared/network/types.ts'

function decodeAll(buf: Buffer): unknown[] {
  const out: unknown[] = []
  const { feed } = createWireDecoder((msg) => out.push(msg))
  feed(buf)
  return out
}

const meta = {
  version: 1 as const,
  type: 'file_chunk' as const,
  msgId: 'm1',
  senderUserId: 'u1',
  senderDeviceId: 'd1',
  groupId: 'g1',
  ts: '2026-08-20T00:00:00.000Z',
  nonce: 'nonce',
  authTag: 'tag'
}

describe('wireProtocol dual stack (TASK-4201)', () => {
  it('still encodes JSON kinds as `{` body after length prefix', () => {
    const framed = encodeWire({ kind: 'ping' })
    expect(framed.readUInt32BE(0)).toBe(framed.length - 4)
    expect(framed[4]).toBe(0x7b)
    expect(decodeAll(framed)).toEqual([{ kind: 'ping' }])
  })

  it('roundtrips envelope JSON path', () => {
    const envelope: SyncEnvelope = {
      ...meta,
      payload: { __enc: 'AAAA' }
    }
    const framed = encodeWire({ kind: 'envelope', envelope })
    expect(framed[4]).toBe(0x7b)
    expect(JSON.stringify(envelope)).toContain('__enc')
    expect(decodeAll(framed)).toEqual([{ kind: 'envelope', envelope }])
  })

  it('encodes envelope_bin with raw ciphertext not in JSON', () => {
    const ciphertext = Buffer.from([0, 1, 2, 255, 7, 8, 9])
    const msg: WireEnvelopeBin = { kind: 'envelope_bin', envelope: meta, ciphertext }
    const framed = encodeWire(msg)
    expect(framed[4]).not.toBe(0x7b)
    const jsonLen = framed.readUInt32BE(4)
    const json = framed.subarray(8, 8 + jsonLen).toString('utf8')
    expect(json).toContain('envelope_bin')
    expect(json).not.toContain(ciphertext.toString('base64'))
    expect(framed.subarray(8 + jsonLen).equals(ciphertext)).toBe(true)

    const decoded = decodeAll(framed)
    expect(decoded).toHaveLength(1)
    const got = decoded[0] as WireEnvelopeBin
    expect(got.kind).toBe('envelope_bin')
    expect(got.envelope.msgId).toBe('m1')
    expect(Buffer.isBuffer(got.ciphertext)).toBe(true)
    expect(got.ciphertext.equals(ciphertext)).toBe(true)
  })

  it('decodes JSON then binary in one feed', () => {
    const a = encodeWire({ kind: 'ping' })
    const b = encodeWire({
      kind: 'envelope_bin',
      envelope: meta,
      ciphertext: Buffer.from('raw-cipher')
    })
    const decoded = decodeAll(Buffer.concat([a, b]))
    expect(decoded[0]).toEqual({ kind: 'ping' })
    expect((decoded[1] as WireEnvelopeBin).ciphertext.equals(Buffer.from('raw-cipher'))).toBe(true)
  })
})

describe('envelope_bin capability (TASK-4203)', () => {
  it('only sends binary frames for file_chunk when peer advertised envBin', () => {
    expect(peerAcceptsEnvelopeBin({})).toBe(false)
    expect(peerAcceptsEnvelopeBin({ envBin: true })).toBe(true)
    expect(shouldSendEnvelopeBin(true, 'file_chunk')).toBe(true)
    expect(shouldSendEnvelopeBin(true, 'chat')).toBe(false)
    expect(shouldSendEnvelopeBin(false, 'file_chunk')).toBe(false)
  })

  it('encodes handshake envBin in JSON wire', () => {
    const framed = encodeWire({
      kind: 'handshake',
      publicKey: 'ab',
      deviceId: 'd',
      userId: 'u',
      displayName: 'n',
      listenPort: 1,
      envBin: true
    })
    expect(framed.subarray(4).toString('utf8')).toContain('"envBin":true')
  })

  it('peerLink handshake copies envBin onto ack', async () => {
    const { readFileSync } = await import('node:fs')
    const { dirname, join } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../../src/main/network/real/peerLink.ts'),
      'utf8'
    )
    expect(src).toMatch(/envBin: true/)
    expect(src).toMatch(/shouldSendEnvelopeBin/)
    expect(src).toMatch(/kind: 'envelope_bin'/)
    expect(src).toMatch(/peerEnvBin = msg\.envBin === true/)
  })
})
