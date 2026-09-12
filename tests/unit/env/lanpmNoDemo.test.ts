import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isLanpmNoDemoEnv } from '@shared/env/lanpmNoDemo'

describe('isLanpmNoDemoEnv', () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.LANPM_NO_DEMO
  })

  afterEach(() => {
    process.env = env
  })

  it('is true when LANPM_NO_DEMO=1', () => {
    process.env.LANPM_NO_DEMO = '1'
    expect(isLanpmNoDemoEnv()).toBe(true)
  })
})
