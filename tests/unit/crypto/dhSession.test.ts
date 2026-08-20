import { describe, expect, it } from 'vitest'
import { deriveAesKey, kdfSaltFromPairingCode } from '../../../src/main/crypto/dhSession.ts'

describe('deriveAesKey salt', () => {
  it('same secret different salt yields different AES keys', () => {
    const secret = Buffer.from('shared-secret-bytes')
    const a = deriveAesKey(secret)
    const b = deriveAesKey(secret, kdfSaltFromPairingCode('123456'))
    const c = deriveAesKey(secret, kdfSaltFromPairingCode('123456'))
    const d = deriveAesKey(secret, kdfSaltFromPairingCode('123 456'))
    expect(a.equals(b)).toBe(false)
    expect(b.equals(c)).toBe(true)
    expect(b.equals(d)).toBe(true)
  })
})
