import { afterEach, describe, expect, it } from 'vitest'
import { shouldBypassPaidPluginLicense } from '../../../src/shared/plugin/licenseDevBypass.ts'

describe('shouldBypassPaidPluginLicense', () => {
  const saved = { ...process.env }

  afterEach(() => {
    process.env = { ...saved }
  })

  it('bypasses when LANPM_LICENSE_SKIP_VERIFY=1', () => {
    process.env.LANPM_LICENSE_SKIP_VERIFY = '1'
    expect(shouldBypassPaidPluginLicense()).toBe(true)
  })

  it('bypasses in NODE_ENV=test', () => {
    delete process.env.LANPM_LICENSE_SKIP_VERIFY
    process.env.NODE_ENV = 'test'
    expect(shouldBypassPaidPluginLicense()).toBe(true)
  })

  it('bypasses when LANPM_NETWORK=stub', () => {
    delete process.env.LANPM_LICENSE_SKIP_VERIFY
    process.env.NODE_ENV = 'production'
    process.env.LANPM_NETWORK = 'stub'
    expect(shouldBypassPaidPluginLicense()).toBe(true)
  })

  it('does not bypass in production-like env without flags', () => {
    delete process.env.LANPM_LICENSE_SKIP_VERIFY
    delete process.env.LANPM_NETWORK
    delete process.env.LANPM_VISUAL_CAPTURE_DIR
    delete process.env.LANPM_E2E
    process.env.NODE_ENV = 'production'
    expect(shouldBypassPaidPluginLicense()).toBe(false)
  })
})
