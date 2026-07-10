import { describe, expect, it } from 'vitest'
import { isTaskDepPatchPayload, type TaskDepPatchPayload } from '../../../src/shared/task/sync.ts'

describe('task_dep_patch protocol', () => {
  const valid: TaskDepPatchPayload = {
    action: 'upsert',
    groupId: 'demo-project',
    dependency: { fromTaskId: 'task_a', toTaskId: 'task_b', type: 'FS' },
    updatedAt: '2026-07-10T12:00:00.000Z'
  }

  it('accepts a valid upsert payload', () => {
    expect(isTaskDepPatchPayload(valid)).toBe(true)
  })

  it('accepts delete with dependency keys only', () => {
    expect(
      isTaskDepPatchPayload({
        ...valid,
        action: 'delete'
      })
    ).toBe(true)
  })

  it('rejects missing groupId', () => {
    expect(isTaskDepPatchPayload({ ...valid, groupId: '' })).toBe(false)
  })

  it('rejects invalid dependency type', () => {
    expect(
      isTaskDepPatchPayload({
        ...valid,
        dependency: { ...valid.dependency, type: 'XX' }
      })
    ).toBe(false)
  })

  it('rejects non-object payload', () => {
    expect(isTaskDepPatchPayload(null)).toBe(false)
    expect(isTaskDepPatchPayload('upsert')).toBe(false)
  })
})
