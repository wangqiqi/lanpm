import { describe, expect, it } from 'vitest'
import { resolveDeptDoneCount } from '../../../src/shared/cockpit/departmentStats'

describe('resolveDeptDoneCount', () => {
  it('uses explicit doneCount when present', () => {
    expect(
      resolveDeptDoneCount({ doneCount: 3, taskCount: 14, completionPercent: 21 })
    ).toBe(3)
  })

  it('derives from completionPercent when doneCount missing', () => {
    expect(
      resolveDeptDoneCount({
        doneCount: undefined as unknown as number,
        taskCount: 14,
        completionPercent: 16
      })
    ).toBe(2)
  })

  it('returns 0 for empty department', () => {
    expect(resolveDeptDoneCount({ doneCount: 0, taskCount: 0, completionPercent: 0 })).toBe(0)
  })
})
