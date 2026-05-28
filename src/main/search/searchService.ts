import type { Database } from 'better-sqlite3'
import type { GlobalSearchHit, GlobalSearchResult } from '../../shared/search/types'
import { getGroupById } from '../storage/repositories/groupRepository'
import { searchMessagesByContent, searchTasksByTitle } from '../storage/repositories/searchRepository'

function groupLabel(db: Database, groupId: string): string {
  const g = getGroupById(db, groupId)
  if (g) return g.name
  if (groupId.startsWith('dm:')) return '私聊'
  return groupId
}

export function globalSearch(db: Database, query: string, limitPerKind = 8): GlobalSearchResult {
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

  return { query: q, hits }
}
