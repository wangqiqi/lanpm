import { describe, expect, it } from 'vitest'
import {
  buildLanpmPeerFile,
  computePeerFileFingerprint,
  parseLanpmPeerFileJson,
  serializeLanpmPeerFile
} from '../../../src/shared/network/peerFile.ts'

describe('peerFile', () => {
  const input = {
    host: '192.168.20.109',
    port: 43124,
    deviceId: 'dev_test',
    displayName: 'ubuntu-lanpm'
  }

  it('builds v1 file with stable fingerprint', () => {
    const file = buildLanpmPeerFile(input)
    expect(file.v).toBe(1)
    expect(file.fingerprint).toBe(computePeerFileFingerprint(input))
  })

  it('round-trips JSON', () => {
    const file = buildLanpmPeerFile(input)
    const parsed = parseLanpmPeerFileJson(serializeLanpmPeerFile(file))
    expect(parsed).toEqual(file)
  })

  it('rejects tampered fingerprint', () => {
    const file = buildLanpmPeerFile(input)
    const tampered = { ...file, host: '10.0.0.1' }
    expect(() => parseLanpmPeerFileJson(JSON.stringify(tampered))).toThrow(
      'peer_file_fingerprint_mismatch'
    )
  })

  it('rejects unsupported version', () => {
    const file = buildLanpmPeerFile(input)
    const next = { ...file, v: 2 }
    expect(() => parseLanpmPeerFileJson(JSON.stringify(next))).toThrow(
      'peer_file_unsupported_version'
    )
  })

  it('includes publicKeyHex in fingerprint', () => {
    const file = buildLanpmPeerFile({ ...input, publicKeyHex: 'aa'.repeat(32) })
    expect(file.publicKeyHex).toBe('aa'.repeat(32))
    const tampered = { ...file, publicKeyHex: 'bb'.repeat(32) }
    expect(() => parseLanpmPeerFileJson(JSON.stringify(tampered))).toThrow(
      'peer_file_fingerprint_mismatch'
    )
    const parsed = parseLanpmPeerFileJson(serializeLanpmPeerFile(file))
    expect(parsed.publicKeyHex).toBe('aa'.repeat(32))
  })
})
