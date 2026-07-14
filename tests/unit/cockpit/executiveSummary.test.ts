import { describe, expect, it } from 'vitest'
import {
  buildExecutiveSummary,
  endOfIsoWeek,
  startOfIsoWeek
} from '../../../src/shared/cockpit/executiveSummary'

describe('buildExecutiveSummary', () => {
  const ref = new Date('2026-07-14T12:00:00')

  it('counts completed this week by updatedAt', () => {
    const summary = buildExecutiveSummary(
      [
        {
          status: 'done',
          updatedAt: '2026-07-13T10:00:00.000Z',
          deletedAt: undefined
        },
        {
          status: 'done',
          updatedAt: '2026-07-05T10:00:00.000Z',
          deletedAt: undefined
        },
        { status: 'doing', updatedAt: '2026-07-14T10:00:00.000Z' }
      ],
      1,
      ref
    )
    expect(summary.completedThisWeek).toBe(1)
    expect(summary.inProgressCount).toBe(1)
    expect(summary.riskProjectCount).toBe(1)
  })

  it('counts tasks due next ISO week', () => {
    const summary = buildExecutiveSummary(
      [
        { status: 'todo', updatedAt: '2026-07-14', endDate: '2026-07-20' },
        { status: 'doing', updatedAt: '2026-07-14', endDate: '2026-07-15' },
        { status: 'done', updatedAt: '2026-07-14', endDate: '2026-07-21' }
      ],
      0,
      ref
    )
    expect(summary.dueNextWeek).toBe(1)
  })

  it('ignores deleted tasks', () => {
    const summary = buildExecutiveSummary(
      [
        {
          status: 'doing',
          updatedAt: '2026-07-14',
          deletedAt: '2026-07-14'
        }
      ],
      0,
      ref
    )
    expect(summary.inProgressCount).toBe(0)
  })
})

describe('startOfIsoWeek', () => {
  it('returns Monday for mid-week', () => {
    const monday = startOfIsoWeek(new Date('2026-07-15'))
    expect(monday.getDay()).toBe(1)
    expect(monday.getDate()).toBe(13)
  })

  it('endOfIsoWeek is Sunday', () => {
    const start = startOfIsoWeek(new Date('2026-07-15'))
    const end = endOfIsoWeek(start)
    expect(end.getDay()).toBe(0)
    expect(end.getDate()).toBe(19)
  })
})
