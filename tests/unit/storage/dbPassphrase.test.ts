import { afterEach, describe, expect, it } from 'vitest'
import { passphraseFromEnv, resolveDbPassphrase } from '../../../src/main/storage/dbPassphrase.ts'

const ENV = 'LANPM_DB_PASSPHRASE'
let prev: string | undefined

afterEach(() => {
  if (prev === undefined) delete process.env[ENV]
  else process.env[ENV] = prev
})

describe('resolveDbPassphrase', () => {
  it('returns undefined for plaintext', async () => {
    prev = process.env[ENV]
    process.env[ENV] = 'should-not-use'
    await expect(resolveDbPassphrase({ kind: 'plain', allowPrompt: false })).resolves.toBeUndefined()
  })

  it('reads LANPM_DB_PASSPHRASE for encrypted files', async () => {
    prev = process.env[ENV]
    process.env[ENV] = '  env-pass-word  '
    expect(passphraseFromEnv()).toBe('env-pass-word')
    await expect(resolveDbPassphrase({ kind: 'encrypted', allowPrompt: false })).resolves.toBe(
      'env-pass-word'
    )
  })

  it('throws when encrypted, no env, and prompt is disallowed', async () => {
    prev = process.env[ENV]
    delete process.env[ENV]
    await expect(resolveDbPassphrase({ kind: 'encrypted', allowPrompt: false })).rejects.toThrow(
      'err.dbPassphraseRequired'
    )
  })
})
