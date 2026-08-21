import { describe, expect, it } from 'vitest'
import type { CockpitDashboard } from '../../../src/shared/cockpit/types'
import {
  buildMonthlyReportMarkdown,
  buildWeeklyReportMarkdown,
  formatReportTaskLine,
  selectMilestonesThisMonth,
  selectOpenTasksDueNextWeek
} from '../../../src/shared/cockpit/reportMarkdown'

const emptyDash: CockpitDashboard = {
  summary: { totalProjects: 0, inProgressCount: 0, delayedCount: 0, riskProjectCount: 0 },
  executiveSummary: {
    completedThisWeek: 0,
    inProgressCount: 0,
    riskProjectCount: 0,
    dueNextWeek: 0
  },
  attentionTasks: [],
  projects: [],
  departments: [],
  weeklyTrend: {
    completedThisWeek: 0,
    completedLastWeek: 0,
    weekOverWeekDelta: 0,
    milestonesCompletedThisWeek: 0,
    milestonesCompletedLastWeek: 0
  }
}

describe('reportMarkdown weekly', () => {
  const ref = new Date('2026-07-14T12:00:00')

  it('selects open tasks due next ISO week', () => {
    const picked = selectOpenTasksDueNextWeek(
      [
        { title: 'A', groupId: 'g', status: 'todo', endDate: '2026-07-20' },
        { title: 'B', groupId: 'g', status: 'doing', endDate: '2026-07-15' },
        { title: 'C', groupId: 'g', status: 'done', endDate: '2026-07-21' }
      ],
      ref
    )
    expect(picked.map((t) => t.title)).toEqual(['A'])
  })

  it('includes 下周计划 section', () => {
    const md = buildWeeklyReportMarkdown(
      emptyDash,
      [formatReportTaskLine({ title: 'Ship', projectName: 'Demo', endDate: '2026-07-20' })],
      '2026-07-14T00:00:00.000Z'
    )
    expect(md).toContain('# LanPM 周报')
    expect(md).toContain('## 下周计划')
    expect(md).toContain('Demo · Ship（截止 2026-07-20）')
  })
})

describe('reportMarkdown monthly', () => {
  const ref = new Date('2026-07-14T12:00:00')

  it('selects milestones in the calendar month', () => {
    const picked = selectMilestonesThisMonth(
      [
        { title: 'M1', groupId: 'g', status: 'todo', milestone: true, endDate: '2026-07-31' },
        { title: 'M2', groupId: 'g', status: 'todo', milestone: true, endDate: '2026-06-01' },
        { title: 'T', groupId: 'g', status: 'todo', milestone: false, endDate: '2026-07-15' }
      ],
      ref
    )
    expect(picked.map((t) => t.title)).toEqual(['M1'])
  })

  it('uses independent monthly headings (not weekly title-swap)', () => {
    const md = buildMonthlyReportMarkdown(emptyDash, ['- M1'], ['- Risk'], 't')
    expect(md).toContain('# LanPM 月报')
    expect(md).toContain('## 本月里程碑')
    expect(md).toContain('## 风险汇总')
    expect(md).not.toContain('# LanPM 周报')
    expect(md).not.toContain('## 下周计划')
  })
})
