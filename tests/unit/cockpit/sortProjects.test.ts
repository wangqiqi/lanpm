import { describe, expect, it } from 'vitest'
import type { ProjectDashboardItem } from '../../../src/shared/cockpit/types'
import {
  countRiskProjects,
  sortCockpitProjects
} from '../../../src/shared/cockpit/sortProjects'

function item(
  partial: Pick<ProjectDashboardItem, 'groupId' | 'name' | 'status' | 'progressPercent'>
): ProjectDashboardItem {
  return {
    inProgressCount: 1,
    delayedCount: partial.status === 'delayed' ? 1 : 0,
    totalTasks: 2,
    ...partial
  }
}

describe('sortCockpitProjects', () => {
  it('orders delayed → risk → normal, then progress ascending', () => {
    const sorted = sortCockpitProjects([
      item({ groupId: 'n80', name: 'N80', status: 'normal', progressPercent: 80 }),
      item({ groupId: 'r40', name: 'R40', status: 'risk', progressPercent: 40 }),
      item({ groupId: 'd20', name: 'D20', status: 'delayed', progressPercent: 20 }),
      item({ groupId: 'r10', name: 'R10', status: 'risk', progressPercent: 10 }),
      item({ groupId: 'd50', name: 'D50', status: 'delayed', progressPercent: 50 })
    ])
    expect(sorted.map((p) => p.groupId)).toEqual(['d20', 'd50', 'r10', 'r40', 'n80'])
  })
})

describe('countRiskProjects', () => {
  it('counts only risk status', () => {
    expect(
      countRiskProjects([
        item({ groupId: 'a', name: 'A', status: 'risk', progressPercent: 1 }),
        item({ groupId: 'b', name: 'B', status: 'delayed', progressPercent: 1 }),
        item({ groupId: 'c', name: 'C', status: 'risk', progressPercent: 1 })
      ])
    ).toBe(2)
  })
})
