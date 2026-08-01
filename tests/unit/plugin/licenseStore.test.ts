import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const isPackaged = vi.hoisted(() => ({ value: false }))
const licenseFileExists = vi.hoisted(() => ({ value: false }))

vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return isPackaged.value
    },
    getPath: () => '/tmp/lanpm-test-userdata'
  }
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    existsSync: () => licenseFileExists.value,
    readFileSync: () => JSON.stringify({ grants: [] }),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn()
  }
})

import {
  assertPaidPluginLicensed,
  getPluginLicenseStatus,
  isPluginLicensed
} from '../../../src/main/plugin/licenseStore.ts'

describe('licenseStore paid gate', () => {
  const saved = { ...process.env }

  beforeEach(() => {
    process.env = { ...saved }
    delete process.env.LANPM_LICENSE_SKIP_VERIFY
    delete process.env.LANPM_NETWORK
    delete process.env.LANPM_VISUAL_CAPTURE_DIR
    delete process.env.LANPM_E2E
    delete process.env.LANPM_BROWSER_DEV
    process.env.NODE_ENV = 'production'
    isPackaged.value = false
    licenseFileExists.value = false
  })

  afterEach(() => {
    process.env = saved
  })

  it('does not bypass when unpackaged but production-like env', () => {
    isPackaged.value = false
    expect(isPluginLicensed('com.example.paid')).toBe(false)
    expect(getPluginLicenseStatus('com.example.paid').licensed).toBe(false)
    expect(() => assertPaidPluginLicensed('com.example.paid', 'paid')).toThrow(
      /license required/
    )
  })

  it('does not bypass when packaged without dev flags', () => {
    isPackaged.value = true
    expect(isPluginLicensed('com.example.paid')).toBe(false)
    expect(() => assertPaidPluginLicensed('com.example.paid', 'paid')).toThrow(
      /license required/
    )
  })

  it('bypasses when LANPM_LICENSE_SKIP_VERIFY=1 (dev-run path)', () => {
    isPackaged.value = true
    process.env.LANPM_LICENSE_SKIP_VERIFY = '1'
    expect(isPluginLicensed('com.example.paid')).toBe(true)
    expect(() => assertPaidPluginLicensed('com.example.paid', 'paid')).not.toThrow()
  })

  it('bypasses free plugins regardless of license', () => {
    isPackaged.value = true
    expect(() => assertPaidPluginLicensed('com.example.free', 'free')).not.toThrow()
  })
})
