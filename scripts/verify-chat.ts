/**
 * M2-01 chat send/receive smoke (in-process dual stub + SQLite).
 * Run: npm run verify:chat
 */
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import type { SyncEnvelope } from '../src/shared/network/types.ts'
import { NetworkStub } from '../src/main/network/stub/NetworkStub.ts'
import {
  insertMessage,
  listMessagesByGroup,
  messageExists
} from '../src/main/storage/repositories/messageRepository.ts'
import type { ChatMessage, ChatPayload } from '../src/shared/chat/types.ts'

const root = dirname(fileURLToPath(import.meta.url))
const schemaSql = readFileSync(join(root, '../src/main/storage/schema.sql'), 'utf8')

const GROUP = 'verify-chat-group'

function openTestDb(): Database.Database {
  const dir = mkdtempSync(join(tmpdir(), 'lanpm-chat-'))
  const dbPath = join(dir, 'test.db')
  const db = new Database(dbPath)
  db.exec(schemaSql)
  return db
}

function handleIncoming(
  db: Database.Database,
  envelope: SyncEnvelope,
  onStored: (msg: ChatMessage) => void
): void {
  if (envelope.type !== 'chat' || !envelope.groupId) return
  const payload = envelope.payload as ChatPayload
  const incoming = payload?.message
  if (!incoming?.msgId || messageExists(db, incoming.msgId)) return
  const stored: ChatMessage = { ...incoming, groupId: envelope.groupId, deliveryStatus: 'sent' }
  insertMessage(db, stored)
  onStored(stored)
}

async function runChatVerify(): Promise<void> {
  const dbA = openTestDb()
  const dbB = openTestDb()

  const stubA = new NetworkStub({
    deviceId: 'dev_chat_a',
    userId: 'user_chat_a',
    displayName: 'Chat A'
  })
  const stubB = new NetworkStub({
    deviceId: 'dev_chat_b',
    userId: 'user_chat_b',
    displayName: 'Chat B'
  })

  stubA.start()
  stubB.start()

  const receivedOnB: ChatMessage[] = []
  stubB.subscribe(GROUP, (env) => handleIncoming(dbB, env, (m) => receivedOnB.push(m)))

  try {
    const lamportTs = 1
    const msg: ChatMessage = {
      msgId: 'msg_verify_1',
      groupId: GROUP,
      senderUserId: 'user_chat_a',
      senderDeviceId: 'dev_chat_a',
      type: 'text',
      content: { kind: 'text', text: 'hello from A' },
      lamportTs,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sending'
    }
    insertMessage(dbA, msg)

    const envelope: SyncEnvelope = {
      version: 1,
      type: 'chat',
      msgId: msg.msgId,
      senderUserId: msg.senderUserId,
      senderDeviceId: msg.senderDeviceId,
      groupId: GROUP,
      ts: msg.createdAt,
      lamportTs,
      payload: { message: msg } satisfies ChatPayload,
      nonce: '',
      authTag: ''
    }

    await stubA.publish(envelope)
    await new Promise((r) => setTimeout(r, 500))

    if (receivedOnB.length !== 1) {
      throw new Error(`B expected 1 message, got ${receivedOnB.length}`)
    }
    const text = receivedOnB[0]?.content
    if (text?.kind !== 'text' || text.text !== 'hello from A') {
      throw new Error('payload mismatch on B')
    }

    const listB = listMessagesByGroup(dbB, GROUP)
    if (listB.length !== 1 || listB[0]?.msgId !== msg.msgId) {
      throw new Error('B SQLite persistence failed')
    }

    const listA = listMessagesByGroup(dbA, GROUP)
    if (listA.length !== 1) {
      throw new Error('A local message missing')
    }
  } finally {
    stubA.stop()
    stubB.stop()
    dbA.close()
    dbB.close()
  }
}

await runChatVerify()
console.log('OK: chat text send/receive via NetworkStub + SQLite')
