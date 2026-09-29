import { describe, expect, it } from 'vitest'
import { isGroupDiscoverable, listAdvertisedGroups } from '@shared/group/advertFilter'

describe('advertFilter（发现目录广告集合 · TASK-DUAL-A05）', () => {
  it('只有显式 autoDiscover=true 的群会被广播', () => {
    const groups = [
      { groupId: 'g-on', autoDiscover: true },
      { groupId: 'g-off', autoDiscover: false },
      { groupId: 'g-undefined' },
      { groupId: 'g-null', autoDiscover: null as unknown as boolean }
    ]
    expect(listAdvertisedGroups(groups).map((g) => g.groupId)).toEqual(['g-on'])
    expect(isGroupDiscoverable({ autoDiscover: true })).toBe(true)
    expect(isGroupDiscoverable({ autoDiscover: false })).toBe(false)
  })

  it('空列表不产生幽灵条目，且不修改入参', () => {
    expect(listAdvertisedGroups([])).toEqual([])
    const groups = [{ groupId: 'a', autoDiscover: true }]
    const snapshot = [...groups]
    listAdvertisedGroups(groups)
    expect(groups).toEqual(snapshot)
  })

  it('演示群不特殊对待：关掉 autoDiscover 就不广播（清库由 NO_DEMO purge 负责）', () => {
    expect(
      listAdvertisedGroups([
        { groupId: 'demo-project', autoDiscover: false },
        { groupId: 'demo-function', autoDiscover: false }
      ])
    ).toEqual([])
    // 仍开启 autoDiscover 的演示群会广播 —— 这是 PRD §11.4.2 的预期语义，
    // 要它消失必须走 LANPM_NO_DEMO=1 的 purgeMockCatalog，而不是在过滤器里加特判。
    expect(
      listAdvertisedGroups([{ groupId: 'demo-project', autoDiscover: true }]).map((g) => g.groupId)
    ).toEqual(['demo-project'])
  })
})
