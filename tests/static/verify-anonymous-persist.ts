/**
 * TASK-5202 — anonymous group chat persists to SQLite; mesh offline sync still skipped.
 * Run: npm run verify:anonymous-persist
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import {
  getMessageById,
  insertMessage,
  listRecentMessagesPage
} from '../../src/main/storage/repositories/messageRepository.ts'
import { clearAnonymousSession, hasAnonymousSession } from '../../src/main/chat/anonymousChatStore.ts'
import type { ChatMessage } from '../../src/shared/chat/types.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:anonymous-persist'], 'missing verify:anonymous-persist script')

const chatService = readFileSync(join(root, 'src/main/chat/chatService.ts'), 'utf8')
assert.doesNotMatch(chatService, /listAnonymousMessages/)
assert.doesNotMatch(chatService, /appendAnonymousMessage/)
assert.match(chatService, /insertMessage\(db, msg\)/)
assert.match(chatService, /listRecentMessagesPage\(db, groupId/)
assert.match(chatService, /isMemoryOnlyChatGroup/)

const store = readFileSync(join(root, 'src/main/chat/anonymousChatStore.ts'), 'utf8')
assert.match(store, /deleteAllMessagesInGroup/)
assert.doesNotMatch(store, /new Map/)

const recall = readFileSync(join(root, 'src/main/chat/recallMessageService.ts'), 'utf8')
assert.match(recall, /updateMessage\(db, updated\)/)
assert.doesNotMatch(recall, /listAnonymousMessages/)

const groupSrc = readFileSync(join(root, 'src/main/group/groupService.ts'), 'utf8')
const leaveIdx = groupSrc.indexOf('export function leaveAnonymousGroup')
const enterIdx = groupSrc.indexOf('export function enterAnonymousGroup')
const dissolveIdx = groupSrc.indexOf('export async function dissolveGroup')
assert.ok(leaveIdx >= 0 && enterIdx > leaveIdx, 'leave/enter order')
const leaveFn = groupSrc.slice(leaveIdx, enterIdx)
const enterFn = groupSrc.slice(enterIdx, enterIdx + 500)
assert.doesNotMatch(leaveFn, /clearAnonymousSession/)
assert.doesNotMatch(enterFn, /clearAnonymousSession/)
assert.match(groupSrc, /clearAnonymousSession\(db, groupId\)/)
assert.ok(dissolveIdx >= 0 || groupSrc.includes('deleteGroupCascade'), 'dissolve still cascades')

const offline = readFileSync(join(root, 'src/main/chat/offlineSyncService.ts'), 'utf8')
assert.match(offline, /isMemoryOnlyChatGroup/)

const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')
const dir = mkLanpmTemp('lanpm-anon-persist-')
const db = new Database(join(dir, 't.db'))
try {
  db.exec(schemaSql)
  const msg: ChatMessage = {
    msgId: 'msg_anon_1',
    groupId: 'demo-anonymous',
    senderUserId: 'u1',
    senderDeviceId: 'd1',
    type: 'text',
    content: { kind: 'text', text: 'hi' },
    lamportTs: 1,
    createdAt: new Date().toISOString(),
    deliveryStatus: 'sent'
  }
  insertMessage(db, msg)
  assert.equal(hasAnonymousSession(db, 'demo-anonymous'), true)
  assert.deepEqual(getMessageById(db, 'msg_anon_1')?.content, { kind: 'text', text: 'hi' })
  assert.equal(listRecentMessagesPage(db, 'demo-anonymous', 50).messages.length, 1)
  clearAnonymousSession(db, 'demo-anonymous')
  assert.equal(hasAnonymousSession(db, 'demo-anonymous'), false)
} finally {
  db.close()
  rmLanpmTemp(dir)
}

console.log('verify-anonymous-persist: SQLite persist + skip mesh history sync OK')
