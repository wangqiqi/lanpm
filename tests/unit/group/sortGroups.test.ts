import { describe, expect, it } from 'vitest'
import {
  loadPinnedGroupIds,
  savePinnedGroupIds,
  togglePinnedGroupId
} from '@shared/group/pinnedGroups'
import { compareGroupsForSwitcher, sortGroupsForSwitcher } from '@shared/group/sortGroups'

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial))
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, String(v))
    },
    removeItem: (k) => {
      map.delete(k)
    },
    key: (i) => [...map.keys()][i] ?? null
  }
}

describe('pinnedGroups', () => {
  it('loads empty when missing or invalid', () => {
    const s = memoryStorage()
    expect(loadPinnedGroupIds(s)).toEqual([])
    s.setItem('lanpm.pinnedGroupIds', '{')
    expect(loadPinnedGroupIds(s)).toEqual([])
  })

  it('toggles pin and persists', () => {
    const s = memoryStorage()
    expect(togglePinnedGroupId('g1', s)).toEqual(['g1'])
    expect(loadPinnedGroupIds(s)).toEqual(['g1'])
    expect(togglePinnedGroupId('g2', s)).toEqual(['g1', 'g2'])
    expect(togglePinnedGroupId('g1', s)).toEqual(['g2'])
  })

  it('dedupes on save', () => {
    const s = memoryStorage()
    savePinnedGroupIds(['a', 'a', 'b'], s)
    expect(loadPinnedGroupIds(s)).toEqual(['a', 'b'])
  })
})

describe('sortGroupsForSwitcher', () => {
  it('pins first then activity desc', () => {
    const sorted = sortGroupsForSwitcher([
      { groupId: 'old', createdAt: '2020-01-01T00:00:00.000Z', pinned: false },
      {
        groupId: 'hot',
        createdAt: '2020-01-01T00:00:00.000Z',
        lastMessageAt: '2026-07-01T00:00:00.000Z',
        pinned: false
      },
      {
        groupId: 'pin',
        createdAt: '2019-01-01T00:00:00.000Z',
        lastMessageAt: '2020-01-01T00:00:00.000Z',
        pinned: true
      }
    ])
    expect(sorted.map((g) => g.groupId)).toEqual(['pin', 'hot', 'old'])
  })

  it('falls back to createdAt when no messages', () => {
    expect(
      compareGroupsForSwitcher(
        { groupId: 'a', createdAt: '2024-01-01T00:00:00.000Z', pinned: false },
        { groupId: 'b', createdAt: '2025-01-01T00:00:00.000Z', pinned: false }
      )
    ).toBeGreaterThan(0)
  })
})
