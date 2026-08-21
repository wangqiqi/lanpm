import type { Database } from 'better-sqlite3'
import {
  deleteAllMessagesInGroup,
  getMaxLamportTs
} from '../storage/repositories/messageRepository.ts'

/** 匿名群本机消息：解散时清 SQLite（leave/enter 不清） */
export function clearAnonymousSession(db: Database, groupId: string): void {
  deleteAllMessagesInGroup(db, groupId)
}

export function hasAnonymousSession(db: Database, groupId: string): boolean {
  return getMaxLamportTs(db, groupId) > 0
}
