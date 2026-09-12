import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const isPackaged = vi.hoisted(() => ({ value: false }))

vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return isPackaged.value
    }
  }
}))

import { shouldSeedMockCatalog } from '../../../src/main/mock/seedMockData'

describe('shouldSeedMockCatalog', () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.LANPM_DEMO
    delete process.env.LANPM_NO_DEMO
    delete process.env.LANPM_VISUAL_CAPTURE_DIR
    isPackaged.value = false
  })

  afterEach(() => {
    process.env = env
  })

  it('seeds in dev (unpackaged)', () => {
    isPackaged.value = false
    expect(shouldSeedMockCatalog()).toBe(true)
  })

  it('skips when LANPM_NO_DEMO=1 (dual-machine handtest)', () => {
    isPackaged.value = false
    process.env.LANPM_NO_DEMO = '1'
    expect(shouldSeedMockCatalog()).toBe(false)
  })

  it('skips in packaged app unless demo override', () => {
    isPackaged.value = true
    expect(shouldSeedMockCatalog()).toBe(false)
    process.env.LANPM_DEMO = '1'
    expect(shouldSeedMockCatalog()).toBe(true)
  })

  it('seeds when visual capture dir is set', () => {
    isPackaged.value = true
    process.env.LANPM_VISUAL_CAPTURE_DIR = '/tmp/capture'
    expect(shouldSeedMockCatalog()).toBe(true)
  })
})
