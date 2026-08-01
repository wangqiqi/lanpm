import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { canonicalizeLicensePayload } from '../../../src/shared/plugin/licenseCanonical.ts'
import type { UnsignedPluginLicense } from '../../../src/shared/plugin/sideloadFormat.ts'
import { LICENSE_ISSUER_PUBLIC_KEY_PEM } from '../../../src/main/plugin/licenseKeys.ts'

const TEST_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIL0EjIVHBgjQuLASP2UF9uCIqThpyUe3vXJdsqtkAWNi
-----END PRIVATE KEY-----`

describe('licenseCanonical', () => {
  it('produces stable canonical JSON', () => {
    const license: UnsignedPluginLicense = {
      version: 1,
      machineId: 'sha256:deadbeef',
      issuedAt: 1_700_000_000_000,
      term: 'trial',
      grants: [
        {
          pluginId: 'lanpm.meeting',
          features: ['license.feature'],
          issuedAt: 1_700_000_000_000,
          expiresAt: 1_707_776_000_000
        }
      ],
      algorithm: 'ed25519'
    }
    const a = canonicalizeLicensePayload(license)
    const b = canonicalizeLicensePayload(license)
    expect(a).toBe(b)
    expect(a).toContain('"pluginId":"lanpm.meeting"')
  })

  it('roundtrips Ed25519 sign/verify with issuer keys', () => {
    const unsigned: UnsignedPluginLicense = {
      version: 1,
      machineId: 'sha256:test',
      issuedAt: 1_700_000_000_000,
      term: 'perpetual',
      grants: [{ pluginId: 'lanpm.meeting', features: ['license.feature'] }],
      algorithm: 'ed25519'
    }
    const message = Buffer.from(canonicalizeLicensePayload(unsigned), 'utf8')
    const privateKey = createPrivateKey(TEST_PRIVATE_KEY_PEM)
    const signature = sign(null, message, privateKey)
    const publicKey = createPublicKey(LICENSE_ISSUER_PUBLIC_KEY_PEM)
    expect(verify(null, message, publicKey, signature)).toBe(true)
  })
})
