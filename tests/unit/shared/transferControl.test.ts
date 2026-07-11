import { describe, expect, it } from 'vitest'
import {
  canCancelTransfer,
  canRetryTransfer,
  estimateBytesPerSecond,
  estimateEtaSeconds,
  formatEtaSeconds,
  formatRate
} from '@shared/file/transferControl'

describe('transferControl', () => {
  it('canCancelTransfer only for queued/transferring', () => {
    expect(canCancelTransfer('queued')).toBe(true)
    expect(canCancelTransfer('transferring')).toBe(true)
    expect(canCancelTransfer('completed')).toBe(false)
    expect(canCancelTransfer('cancelled')).toBe(false)
    expect(canCancelTransfer('failed')).toBe(false)
  })

  it('canRetryTransfer for failed/paused/cancelled', () => {
    expect(canRetryTransfer('failed', 'upload', 0)).toBe(true)
    expect(canRetryTransfer('paused', 'download', 10)).toBe(true)
    expect(canRetryTransfer('cancelled', 'download', 100)).toBe(true)
    expect(canRetryTransfer('completed', 'download', 100)).toBe(false)
    expect(canRetryTransfer('transferring', 'download', 50)).toBe(true)
    expect(canRetryTransfer('transferring', 'upload', 50)).toBe(false)
  })

  it('estimateBytesPerSecond from samples', () => {
    expect(estimateBytesPerSecond([{ t: 0, bytes: 0 }])).toBeNull()
    expect(estimateBytesPerSecond([{ t: 0, bytes: 0 }, { t: 100, bytes: 1000 }])).toBeNull()
    const rate = estimateBytesPerSecond([
      { t: 0, bytes: 0 },
      { t: 1000, bytes: 100_000 }
    ])
    expect(rate).toBe(100_000)
  })

  it('estimateEtaSeconds and formatters', () => {
    expect(estimateEtaSeconds(0, 100)).toBe(0)
    expect(estimateEtaSeconds(1000, 100)).toBe(10)
    expect(estimateEtaSeconds(1000, 0)).toBeNull()
    expect(formatEtaSeconds(10)).toBe('10s')
    expect(formatEtaSeconds(90)).toBe('1m 30s')
    expect(formatRate(512)).toBe('512 B/s')
    expect(formatRate(2048)).toBe('2.0 KB/s')
    expect(formatRate(null)).toBeNull()
  })
})
