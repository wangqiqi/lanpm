import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { generateDhKeyPair } from '../../../src/main/crypto/dhSession.ts'
import { loadOrCreateDeviceKeyPair } from '../../../src/main/crypto/deviceKeyStore.ts'
import {
  acceptOrPinPeerPublicKey,
  getPinnedPeerPublicKey,
  PEER_PUBKEY_MISMATCH,
  pinPeerPublicKey
} from '../../../src/main/crypto/peerTrustStore.ts'

describe('peerTrustStore + deviceKeyStore', () => {
  let dir: string
  let prev: string | undefined

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'lanpm-trust-'))
    prev = process.env.LANPM_USER_DATA
    process.env.LANPM_USER_DATA = dir
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.LANPM_USER_DATA
    else process.env.LANPM_USER_DATA = prev
    rmSync(dir, { recursive: true, force: true })
  })

  it('persists device ECDH across load', () => {
    const a = loadOrCreateDeviceKeyPair('dev_a')
    const b = loadOrCreateDeviceKeyPair('dev_a')
    expect(b.publicKey.equals(a.publicKey)).toBe(true)
    expect(b.privateKey.equals(a.privateKey)).toBe(true)
  })

  it('TOFU pins then rejects a different key', () => {
    const first = generateDhKeyPair().publicKey.toString('hex')
    const second = generateDhKeyPair().publicKey.toString('hex')
    acceptOrPinPeerPublicKey('peer_1', first, 'tofu')
    expect(getPinnedPeerPublicKey('peer_1')?.publicKeyHex).toBe(first.toLowerCase())
    expect(() => pinPeerPublicKey('peer_1', second, 'tofu')).toThrow(PEER_PUBKEY_MISMATCH)
  })

  it('matching pin upgrades pairing over tofu', () => {
    const pk = generateDhKeyPair().publicKey.toString('hex')
    pinPeerPublicKey('peer_2', pk, 'tofu')
    pinPeerPublicKey('peer_2', pk, 'pairing')
    expect(getPinnedPeerPublicKey('peer_2')?.source).toBe('pairing')
  })
})
