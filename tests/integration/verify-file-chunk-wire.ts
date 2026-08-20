/**
 * TASK-4204 — TCP scheme B: file_chunk ciphertext is not JSON `__enc` Base64.
 * Run: npm run verify:file-chunk-wire
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createWireDecoder,
  encodeWire,
  shouldSendEnvelopeBin,
  type WireEnvelopeBin,
  type WireMessage
} from '../../src/main/network/real/wireProtocol.ts'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const peerLinkSrc = readFileSync(join(projectRoot, 'src/main/network/real/peerLink.ts'), 'utf8')
assert.match(peerLinkSrc, /envBin: true/)
assert.match(peerLinkSrc, /shouldSendEnvelopeBin/)
assert.match(peerLinkSrc, /envelope_bin/)
assert.match(peerLinkSrc, /sealEnvelopeParts/)

assert.equal(shouldSendEnvelopeBin(true, 'file_chunk'), true)
assert.equal(shouldSendEnvelopeBin(false, 'file_chunk'), false)
assert.equal(shouldSendEnvelopeBin(true, 'chat'), false)

const meta = {
  version: 1 as const,
  type: 'file_chunk' as const,
  msgId: 'fc_wire',
  senderUserId: 'u1',
  senderDeviceId: 'd1',
  groupId: 'g1',
  ts: '2026-08-20T00:00:00.000Z',
  nonce: 'n',
  authTag: 't'
}

const jsonSealed: SyncEnvelope = {
  ...meta,
  payload: { __enc: Buffer.alloc(32, 9).toString('base64') }
}
const jsonFrame = encodeWire({ kind: 'envelope', envelope: jsonSealed })
assert.equal(jsonFrame[4], 0x7b, 'JSON envelope body starts with {')
assert.ok(jsonFrame.includes(Buffer.from('__enc')), 'legacy path still carries __enc')

const ciphertext = Buffer.from([9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 255, 128])
const binFrame = encodeWire({ kind: 'envelope_bin', envelope: meta, ciphertext })
assert.notEqual(binFrame[4], 0x7b, 'envelope_bin body is not a JSON object')
const jsonLen = binFrame.readUInt32BE(4)
const headerJson = binFrame.subarray(8, 8 + jsonLen).toString('utf8')
assert.match(headerJson, /envelope_bin/)
assert.ok(
  !headerJson.includes(ciphertext.toString('base64')),
  'ciphertext must not be Base64 in JSON header'
)
assert.ok(binFrame.subarray(8 + jsonLen).equals(ciphertext), 'ciphertext appended raw')

const decoded: WireMessage[] = []
const { feed } = createWireDecoder((msg) => decoded.push(msg))
feed(binFrame)
assert.equal(decoded.length, 1)
assert.equal(decoded[0]?.kind, 'envelope_bin')
const bin = decoded[0] as WireEnvelopeBin
assert.ok(bin.ciphertext.equals(ciphertext), 'decoder yields raw ciphertext')

console.log('verify:file-chunk-wire OK')
