import { describe, expect, it } from 'vitest'
import {
  clampFileTransferRateKbps,
  FILE_TRANSFER_RATE_MAX_KBPS
} from '@shared/file/settings'

describe('clampFileTransferRateKbps', () => {
  it('keeps 0 as unlimited', () => {
    expect(clampFileTransferRateKbps(0)).toBe(0)
  })

  it('keeps valid mid-range rates', () => {
    expect(clampFileTransferRateKbps(1024)).toBe(1024)
    expect(clampFileTransferRateKbps(FILE_TRANSFER_RATE_MAX_KBPS)).toBe(FILE_TRANSFER_RATE_MAX_KBPS)
  })

  it('floors fractional values', () => {
    expect(clampFileTransferRateKbps(10.9)).toBe(10)
  })

  it('clamps above max', () => {
    expect(clampFileTransferRateKbps(FILE_TRANSFER_RATE_MAX_KBPS + 1)).toBe(
      FILE_TRANSFER_RATE_MAX_KBPS
    )
    expect(clampFileTransferRateKbps(Number.MAX_SAFE_INTEGER)).toBe(FILE_TRANSFER_RATE_MAX_KBPS)
  })

  it('maps invalid / negative to 0', () => {
    expect(clampFileTransferRateKbps(-1)).toBe(0)
    expect(clampFileTransferRateKbps(Number.NaN)).toBe(0)
    expect(clampFileTransferRateKbps(Number.POSITIVE_INFINITY)).toBe(0)
    expect(clampFileTransferRateKbps(undefined)).toBe(0)
    expect(clampFileTransferRateKbps(null)).toBe(0)
  })
})
