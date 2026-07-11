import { describe, expect, it } from 'vitest'
import { clampTransferStartOffset } from '@shared/file/transferOffset'

describe('clampTransferStartOffset', () => {
  it('keeps valid mid-file offset', () => {
    expect(clampTransferStartOffset(1024, 4096)).toBe(1024)
  })

  it('floors fractional offset', () => {
    expect(clampTransferStartOffset(10.9, 100)).toBe(10)
  })

  it('restarts on negative / non-finite / missing', () => {
    expect(clampTransferStartOffset(-1, 100)).toBe(0)
    expect(clampTransferStartOffset(Number.NaN, 100)).toBe(0)
    expect(clampTransferStartOffset(Number.POSITIVE_INFINITY, 100)).toBe(0)
    expect(clampTransferStartOffset(undefined, 100)).toBe(0)
    expect(clampTransferStartOffset(null, 100)).toBe(0)
  })

  it('restarts when offset is at or past EOF', () => {
    expect(clampTransferStartOffset(100, 100)).toBe(0)
    expect(clampTransferStartOffset(101, 100)).toBe(0)
  })

  it('returns 0 when totalBytes is invalid', () => {
    expect(clampTransferStartOffset(10, 0)).toBe(0)
    expect(clampTransferStartOffset(10, -5)).toBe(0)
    expect(clampTransferStartOffset(10, Number.NaN)).toBe(0)
  })
})
