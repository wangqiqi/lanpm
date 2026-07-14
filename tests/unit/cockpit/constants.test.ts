import { describe, expect, it } from 'vitest'
import { COCKPIT_UNASSIGNED_DEPT, formatDeptForReport } from '../../../src/shared/cockpit/constants'

describe('cockpit department constants', () => {
  it('maps unassigned sentinel for reports', () => {
    expect(formatDeptForReport(COCKPIT_UNASSIGNED_DEPT)).toBe('未分配')
    expect(formatDeptForReport('研发部')).toBe('研发部')
  })
})
