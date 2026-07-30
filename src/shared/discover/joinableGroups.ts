import type { DiscoverGroupView } from './types'

/** 尚未加入且未在申请中的可发现群组。 */
export function listJoinableDiscoverGroups(groups: DiscoverGroupView[]): DiscoverGroupView[] {
  return groups.filter((g) => !g.joined && !g.joinPending)
}

/** 仅当恰好 1 个可加入群时返回该群（配对后自动入群用）。 */
export function pickSingleJoinableGroup(groups: DiscoverGroupView[]): DiscoverGroupView | null {
  const joinable = listJoinableDiscoverGroups(groups)
  return joinable.length === 1 ? joinable[0]! : null
}
