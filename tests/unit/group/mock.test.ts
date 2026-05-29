import { describe, expect, it } from 'vitest'
import { isMockGroupId, MOCK_GROUPS } from '@shared/group/mock'

describe('mock groups', () => {
  it('lists demo groups with stable ids', () => {
    expect(MOCK_GROUPS.map((g) => g.groupId)).toEqual([
      'demo-project',
      'demo-function',
      'demo-anonymous'
    ])
  })

  it('detects demo- prefixed group ids', () => {
    expect(isMockGroupId('demo-project')).toBe(true)
    expect(isMockGroupId('real-group')).toBe(false)
  })
})
