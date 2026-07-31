import { describe, expect, it } from 'vitest'
import { isPluginLicenseActive } from '../../../src/renderer/src/plugin/pluginLicense.ts'
import type { PluginView } from '../../../src/shared/plugin/types.ts'

function basePlugin(overrides: Partial<PluginView> = {}): PluginView {
  return {
    id: 'lanpm.meeting',
    name: 'Meeting',
    version: '0.1.0',
    slots: ['chat.toolbar.media'],
    capabilities: [],
    pricing: 'paid',
    enabled: true,
    dirName: 'lanpm.meeting',
    source: 'builtin',
    signatureValid: true,
    licensed: false,
    ...overrides
  }
}

describe('isPluginLicenseActive', () => {
  it('allows free plugins without license', () => {
    expect(isPluginLicenseActive(basePlugin({ pricing: 'free', licensed: false }))).toBe(true)
    expect(isPluginLicenseActive(basePlugin({ pricing: 'free', licensed: null }))).toBe(true)
  })

  it('requires licensed true for paid plugins', () => {
    expect(isPluginLicenseActive(basePlugin({ licensed: false }))).toBe(false)
    expect(isPluginLicenseActive(basePlugin({ licensed: null }))).toBe(false)
    expect(isPluginLicenseActive(basePlugin({ licensed: true }))).toBe(true)
  })
})
