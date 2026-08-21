import type { Database } from 'better-sqlite3'
import {
  deleteAllMessagesInGroup,
  getMaxLamportTs
} from '../storage/repositories/messageRepository.ts'

/** 匿名群本机会话：清 SQLite 消息（leave/enter 在 TASK-5203 才停清） */
export function clearAnonymousSession(db: Database, groupId: string): void {
  deleteAllMessagesInGroup(db, groupId)
}

export function hasAnonymousSession(db: Database, groupId: string): boolean {
  return getMaxLamportTs(db, groupId) > 0
}
