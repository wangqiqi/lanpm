import { describe, expect, it } from 'vitest'
import { buildExecutiveSummary } from '../../../src/shared/cockpit/executiveSummary'
import { buildWeeklyTrend, formatWeekOverWeekDelta } from '../../../src/shared/cockpit/weeklyTrend'

describe('buildWeeklyTrend', () => {
  const ref = new Date('2026-07-14T12:00:00')

  it('counts completed tasks per ISO week via updatedAt', () => {
    const tasks = [
      {
        status: 'done' as const,
        updatedAt: '2026-07-13T10:00:00.000Z',
        deletedAt: undefined
      },
      {
        status: 'done' as const,
        updatedAt: '2026-07-06T10:00:00.000Z',
        deletedAt: undefined
      },
      {
        status: 'done' as const,
        updatedAt: '2026-06-29T10:00:00.000Z',
        deletedAt: undefined
      },
      { status: 'doing' as const, updatedAt: '2026-07-14T10:00:00.000Z' }
    ]
    const trend = buildWeeklyTrend(tasks, ref)
    expect(trend.completedThisWeek).toBe(1)
    expect(trend.completedLastWeek).toBe(1)
    expect(trend.weekOverWeekDelta).toBe(0)
  })

  it('tracks milestone completions separately', () => {
    const trend = buildWeeklyTrend(
      [
        {
          status: 'done',
          updatedAt: '2026-07-13T10:00:00.000Z',
          milestone: true
        },
        {
          status: 'done',
          updatedAt: '2026-07-06T10:00:00.000Z',
          milestone: true
        }
      ],
      ref
    )
    expect(trend.milestonesCompletedThisWeek).toBe(1)
    expect(trend.milestonesCompletedLastWeek).toBe(1)
  })

  it('ignores deleted tasks', () => {
    const trend = buildWeeklyTrend(
      [
        {
          status: 'done',
          updatedAt: '2026-07-13T10:00:00.000Z',
          deletedAt: '2026-07-14'
        }
      ],
      ref
    )
    expect(trend.completedThisWeek).toBe(0)
  })

  it('aligns completedThisWeek with executive summary', () => {
    const tasks = [
      { status: 'done' as const, updatedAt: '2026-07-13T10:00:00.000Z' },
      { status: 'doing' as const, updatedAt: '2026-07-14T10:00:00.000Z' }
    ]
    const trend = buildWeeklyTrend(tasks, ref)
    const summary = buildExecutiveSummary(tasks, 0, ref)
    expect(trend.completedThisWeek).toBe(summary.completedThisWeek)
  })
})

describe('formatWeekOverWeekDelta', () => {
  it('prefixes positive deltas', () => {
    expect(formatWeekOverWeekDelta(3)).toBe('+3')
    expect(formatWeekOverWeekDelta(0)).toBe('0')
    expect(formatWeekOverWeekDelta(-2)).toBe('-2')
  })
})
