import { describe, expect, it } from 'vitest'
import { shouldDeferHeavyContentForRow } from '../../../src/renderer/src/features/chat/messageContentDefer.tsx'

describe('shouldDeferHeavyContentForRow', () => {
  const viewportHeight = 400

  it('defers rows above viewport', () => {
    expect(shouldDeferHeavyContentForRow(0, 80, 200, viewportHeight)).toBe(true)
  })

  it('defers rows below viewport', () => {
    expect(shouldDeferHeavyContentForRow(700, 80, 200, viewportHeight)).toBe(true)
  })

  it('keeps rows intersecting viewport', () => {
    expect(shouldDeferHeavyContentForRow(250, 80, 200, viewportHeight)).toBe(false)
  })

  it('does not defer when viewport height unknown', () => {
    expect(shouldDeferHeavyContentForRow(0, 80, 0, 0)).toBe(false)
  })
})
