import { describe, expect, it } from 'vitest'
import { lwwShouldApply } from '../../../src/shared/sync/lww'

describe('lwwShouldApply', () => {
  const t1 = '2026-07-11T00:00:00.000Z'
  const t2 = '2026-07-11T00:00:01.000Z'

  it('applies when local missing', () => {
    expect(lwwShouldApply(t1, null, 'dev_b', 'dev_a')).toBe(true)
    expect(lwwShouldApply(t1, undefined, 'dev_b', 'dev_a')).toBe(true)
  })

  it('applies when remote newer', () => {
    expect(lwwShouldApply(t2, t1, 'dev_a', 'dev_b')).toBe(true)
  })

  it('rejects when remote older', () => {
    expect(lwwShouldApply(t1, t2, 'dev_b', 'dev_a')).toBe(false)
  })

  it('on equal updatedAt prefers higher senderDeviceId', () => {
    expect(lwwShouldApply(t1, t1, 'dev_b', 'dev_a')).toBe(true)
    expect(lwwShouldApply(t1, t1, 'dev_a', 'dev_b')).toBe(false)
    expect(lwwShouldApply(t1, t1, 'dev_a', 'dev_a')).toBe(false)
  })

  it('on equal updatedAt with empty local writer accepts remote', () => {
    expect(lwwShouldApply(t1, t1, 'dev_a', '')).toBe(true)
    expect(lwwShouldApply(t1, t1, 'dev_a', null)).toBe(true)
  })
})
