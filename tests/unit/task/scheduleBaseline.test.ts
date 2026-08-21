import { describe, expect, it } from 'vitest'
import {
  barStylesForBaselineVariance,
  compareScheduleToBaseline,
  countSlippedVsBaseline
} from '../../../src/shared/task/scheduleBaseline.ts'

describe('compareScheduleToBaseline', () => {
  it('marks slipped when current end is later', () => {
    expect(
      compareScheduleToBaseline(
        { startDate: '2026-08-01', endDate: '2026-08-20' },
        { taskId: 't1', startDate: '2026-08-01', endDate: '2026-08-10' }
      )
    ).toBe('slipped')
  })

  it('marks ahead when current end is earlier', () => {
    expect(
      compareScheduleToBaseline(
        { startDate: '2026-08-01', endDate: '2026-08-05' },
        { taskId: 't1', startDate: '2026-08-01', endDate: '2026-08-10' }
      )
    ).toBe('ahead')
  })

  it('counts slipped rows', () => {
    const n = countSlippedVsBaseline(
      new Map([
        ['a', { startDate: '2026-01-01', endDate: '2026-01-20' }],
        ['b', { startDate: '2026-01-01', endDate: '2026-01-05' }]
      ]),
      {
        groupId: 'g1',
        frozenAt: 'x',
        tasks: [
          { taskId: 'a', startDate: '2026-01-01', endDate: '2026-01-10' },
          { taskId: 'b', startDate: '2026-01-01', endDate: '2026-01-10' }
        ]
      }
    )
    expect(n).toBe(1)
  })

  it('tints slipped bars', () => {
    const styles = barStylesForBaselineVariance({ backgroundColor: '#0066cc' }, 'slipped')
    expect(styles?.backgroundColor).toBe('#c2410c')
  })
})
