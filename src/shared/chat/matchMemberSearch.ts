import type { GroupMemberView } from './members'
import { matchesGroupSearch } from '../group/matchGroupSearch.ts'

/**
 * 成员搜索：显示名 / userId / mentionKeys — 汉字子串或拼音（复用群搜）。
 * 空查询视为全部命中。
 */
export function matchesMemberSearch(
  member: Pick<GroupMemberView, 'displayName' | 'userId' | 'mentionKeys'>,
  query: string
): boolean {
  const q = query.trim()
  if (!q) return true
  if (matchesGroupSearch(member.displayName, q)) return true
  if (matchesGroupSearch(member.userId, q)) return true
  for (const key of member.mentionKeys ?? []) {
    if (matchesGroupSearch(key, q)) return true
  }
  return false
}

/** 按负责人搜索过滤任务；空查询不过滤；无负责人任务在有查询时排除 */
export function filterTasksByAssigneeSearch<
  T extends { assigneeUserId?: string | null }
>(
  tasks: ReadonlyArray<T>,
  members: ReadonlyArray<Pick<GroupMemberView, 'userId' | 'displayName' | 'mentionKeys'>>,
  query: string
): T[] {
  const q = query.trim()
  if (!q) return [...tasks]
  const byId = new Map(members.map((m) => [m.userId, m]))
  return tasks.filter((task) => {
    const id = task.assigneeUserId
    if (!id) return false
    const member = byId.get(id)
    if (member) return matchesMemberSearch(member, q)
    return matchesGroupSearch(id, q)
  })
}

/** antd Select `filterOption`：按成员拼音/显示名匹配（未指派项用 label） */
export function memberSelectFilterOption(
  input: string,
  option: { value?: string | number | null; label?: unknown } | undefined,
  members: ReadonlyArray<Pick<GroupMemberView, 'userId' | 'displayName' | 'mentionKeys'>>
): boolean {
  const value = String(option?.value ?? '')
  const label = String(option?.label ?? '')
  if (!value) return matchesGroupSearch(label, input)
  const member = members.find((m) => m.userId === value)
  if (member) return matchesMemberSearch(member, input)
  return matchesGroupSearch(label, input)
}
