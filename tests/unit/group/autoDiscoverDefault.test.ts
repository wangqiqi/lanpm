import { describe, expect, it } from 'vitest'
import { DEFAULT_GROUP_AUTO_DISCOVER } from '@shared/group/types'

describe('DEFAULT_GROUP_AUTO_DISCOVER', () => {
  it('defaults new groups to not discoverable', () => {
    expect(DEFAULT_GROUP_AUTO_DISCOVER).toBe(false)
  })
})
