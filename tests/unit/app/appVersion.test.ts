import { describe, expect, it } from 'vitest'
import { LANPM_APP_VERSION } from '@shared/appVersion'
import pkg from '../../../package.json'

describe('LANPM_APP_VERSION', () => {
  it('matches package.json version', () => {
    expect(LANPM_APP_VERSION).toBe(pkg.version)
    expect(LANPM_APP_VERSION.length).toBeGreaterThan(0)
  })
})
