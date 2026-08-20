import type { Database } from 'better-sqlite3'
import { LANPM_DM_GROUP_LABEL } from '../../shared/constants/display'
import type { GlobalSearchHit, GlobalSearchResult } from '../../shared/search/types'
import { getGroupById } from '../storage/repositories/groupRepository'
import { searchMessagesByContent, searchTasksByTitle } from '../storage/repositories/searchRepository'

/** 任务/消息命中：searchRepository 灌 SQLite 行后走 miniSearchIndex（minisearch）。成员仍内存匹配。 */
import { listUserGroups } from '../group/groupService'
import { listGroupMembers } from '../chat/memberService'

function groupLabel(db: Database, groupId: string): string {
  const g = getGroupById(db, groupId)
  if (g) return g.name
  if (groupId.startsWith('dm:')) return LANPM_DM_GROUP_LABEL
  return groupId
}

async function searchMembersGlobal(
  db: Database,
  query: string,
  limit: number
): Promise<GlobalSearchHit[]> {
  const q = query.toLowerCase()
  const hits: GlobalSearchHit[] = []
  const seen = new Set<string>()

  for (const group of listUserGroups(db)) {
    const members = await listGroupMembers(db, group.groupId)
    for (const member of members) {
      const key = `${group.groupId}:${member.userId}`
      if (seen.has(key)) continue
      const nameMatch = member.displayName.toLowerCase().includes(q)
      const idMatch = member.userId.toLowerCase().includes(q)
      const mentionMatch = member.mentionKeys?.some((k) => k.toLowerCase().includes(q))
      if (!nameMatch && !idMatch && !mentionMatch) continue
      seen.add(key)
      hits.push({
        kind: 'member',
        groupId: group.groupId,
        userId: member.userId,
        displayName: member.displayName,
        groupName: groupLabel(db, group.groupId)
      })
      if (hits.length >= limit) return hits
    }
  }
  return hits
}

export async function globalSearch(
  db: Database,
  query: string,
  limitPerKind = 8
): Promise<GlobalSearchResult> {
  const q = query.trim()
  if (!q) return { query: q, hits: [] }

  const hits: GlobalSearchHit[] = []

  for (const t of searchTasksByTitle(db, q, limitPerKind)) {
    hits.push({
      kind: 'task',
      groupId: t.groupId,
      taskId: t.taskId,
      title: t.title,
      groupName: groupLabel(db, t.groupId)
    })
  }

  for (const m of searchMessagesByContent(db, q, limitPerKind)) {
    hits.push({
      kind: 'message',
      groupId: m.groupId,
      msgId: m.msgId,
      snippet: m.snippet,
      groupName: groupLabel(db, m.groupId)
    })
  }

  for (const member of await searchMembersGlobal(db, q, limitPerKind)) {
    hits.push(member)
  }

  return { query: q, hits }
}
