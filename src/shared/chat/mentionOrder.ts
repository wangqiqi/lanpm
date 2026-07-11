import type { GroupMemberView } from './members.ts'
import { matchesAssigneeAlias } from '../task/dueNudge.ts'

/**
 * 提及候选排序：可选置顶负责人；@负责人 别名时优先/仅显示置顶成员。
 */
export function orderMentionCandidates(
  members: ReadonlyArray<GroupMemberView>,
  query: string,
  options?: { pinUserIds?: ReadonlyArray<string> }
): GroupMemberView[] {
  const q = query.toLowerCase()
  const pinSet = new Set(options?.pinUserIds?.filter(Boolean) ?? [])
  const alias = matchesAssigneeAlias(q)

  const filtered = members.filter((m) => {
    if (alias && pinSet.size > 0) {
      return pinSet.has(m.userId)
    }
    if (alias && pinSet.size === 0) {
      return true
    }
    const name = m.displayName.toLowerCase()
    const id = m.userId.toLowerCase()
    const keys = m.mentionKeys?.map((k) => k.toLowerCase()) ?? []
    return name.includes(q) || id.includes(q) || keys.some((k) => k.includes(q))
  })

  if (pinSet.size === 0) return filtered

  const pinned: GroupMemberView[] = []
  const rest: GroupMemberView[] = []
  for (const m of filtered) {
    if (pinSet.has(m.userId)) pinned.push(m)
    else rest.push(m)
  }
  const byId = new Map(pinned.map((m) => [m.userId, m]))
  const orderedPinned = [...pinSet]
    .map((id) => byId.get(id))
    .filter((m): m is GroupMemberView => Boolean(m))
  return [...orderedPinned, ...rest]
}
