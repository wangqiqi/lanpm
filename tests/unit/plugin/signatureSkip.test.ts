import { describe, expect, it } from 'vitest'
import { shouldSkipPluginSignatureVerify } from '../../../src/main/plugin/signatureVerify.ts'

describe('shouldSkipPluginSignatureVerify', () => {
  it('never skips when packaged', () => {
    expect(
      shouldSkipPluginSignatureVerify(
        { LANPM_PLUGIN_SKIP_VERIFY: '1', NODE_ENV: 'test' },
        true
      )
    ).toBe(false)
  })

  it('skips unpackaged when env flag or test', () => {
    expect(shouldSkipPluginSignatureVerify({ LANPM_PLUGIN_SKIP_VERIFY: '1' }, false)).toBe(true)
    expect(shouldSkipPluginSignatureVerify({ NODE_ENV: 'test' }, false)).toBe(true)
    expect(shouldSkipPluginSignatureVerify({ NODE_ENV: 'production' }, false)).toBe(false)
  })
})
