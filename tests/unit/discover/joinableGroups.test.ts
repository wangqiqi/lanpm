import { describe, expect, it } from 'vitest'
import type { DiscoverGroupView } from '../../../src/shared/discover/types'
import {
  listJoinableDiscoverGroups,
  pickSingleJoinableGroup
} from '../../../src/shared/discover/joinableGroups'

const base = (overrides: Partial<DiscoverGroupView>): DiscoverGroupView => ({
  groupId: 'g1',
  name: 'Test',
  type: 'project',
  ownerUserId: 'u1',
  ownerDisplayName: 'Owner',
  joined: false,
  joinPending: false,
  ...overrides
})

describe('joinableGroups', () => {
  it('filters joined and pending', () => {
    const groups = [
      base({ groupId: 'a', joined: true }),
      base({ groupId: 'b', joinPending: true }),
      base({ groupId: 'c' })
    ]
    expect(listJoinableDiscoverGroups(groups).map((g) => g.groupId)).toEqual(['c'])
  })

  it('pickSingle returns only when length is 1', () => {
    expect(pickSingleJoinableGroup([base({ groupId: 'only' })])).toMatchObject({ groupId: 'only' })
    expect(pickSingleJoinableGroup([base({ groupId: 'a' }), base({ groupId: 'b' })])).toBeNull()
    expect(pickSingleJoinableGroup([])).toBeNull()
  })
})
