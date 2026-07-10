/**
 * TASK-133 — chat history page APIs (recent + before).
 * Run: npm run verify:chat-history-page
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import {
  insertMessage,
  listMessagesBeforePage,
  listRecentMessagesPage
} from '../../src/main/storage/repositories/messageRepository.ts'
import { CHAT_HISTORY_PAGE_SIZE } from '../../src/shared/chat/pagination.ts'
import type { ChatMessage } from '../../src/shared/chat/types.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')
const dir = mkLanpmTemp('lanpm-chat-page-')
const db = new Database(join(dir, 't.db'))
db.exec(schemaSql)

const GROUP = 'g-page'
const TOTAL = CHAT_HISTORY_PAGE_SIZE + 40
const now = new Date().toISOString()

function msg(i: number): ChatMessage {
  return {
    msgId: `msg_${i}`,
    groupId: GROUP,
    senderUserId: 'u1',
    senderDeviceId: 'd1',
    type: 'text',
    content: { kind: 'text', text: String(i) },
    lamportTs: i,
    createdAt: now,
    deliveryStatus: 'sent'
  }
}

try {
  for (let i = 1; i <= TOTAL; i++) insertMessage(db, msg(i))

  const recent = listRecentMessagesPage(db, GROUP)
  assert.equal(recent.messages.length, CHAT_HISTORY_PAGE_SIZE)
  assert.equal(recent.hasMore, true)
  assert.equal(recent.messages[0]?.lamportTs, TOTAL - CHAT_HISTORY_PAGE_SIZE + 1)
  assert.equal(recent.messages.at(-1)?.lamportTs, TOTAL)

  const older = listMessagesBeforePage(db, GROUP, recent.messages[0]!.lamportTs)
  assert.equal(older.messages.length, 40)
  assert.equal(older.hasMore, false)
  assert.equal(older.messages[0]?.lamportTs, 1)
  assert.equal(older.messages.at(-1)?.lamportTs, 40)

  console.log('verify:chat-history-page OK')
} finally {
  db.close()
  rmLanpmTemp(dir)
}
