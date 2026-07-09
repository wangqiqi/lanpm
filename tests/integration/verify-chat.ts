/**
 * M2-01 chat send/receive smoke (in-process dual stub + SQLite).
 * Run: npm run verify:chat
 */
import { join } from 'path'
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import { NetworkStub } from '../../src/main/network/stub/NetworkStub.ts'
import {
  insertMessage,
  listMessagesByGroup,
  messageExists
} from '../../src/main/storage/repositories/messageRepository.ts'
import type { ChatMessage, ChatPayload } from '../../src/shared/chat/types.ts'
import { detectLanguage } from '../../src/shared/chat/detectLanguage.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const _tempDirs: string[] = []

const GROUP = 'verify-chat-group'

function openTestDb(): Database.Database {
  const dir = mkLanpmTemp('lanpm-chat-')
  _tempDirs.push(dir)
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

    const pyCode = 'def hello():\n    print("LanPM")'
    const detected = detectLanguage(pyCode)
    if (detected !== 'python') {
      throw new Error(`detectLanguage expected python, got ${detected}`)
    }

    const lamportTs2 = 2
    const codeMsg: ChatMessage = {
      msgId: 'msg_verify_code_1',
      groupId: GROUP,
      senderUserId: 'user_chat_a',
      senderDeviceId: 'dev_chat_a',
      type: 'code',
      content: { kind: 'code', language: detected, code: pyCode },
      lamportTs: lamportTs2,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sending'
    }
    insertMessage(dbA, codeMsg)

    const codeEnvelope: SyncEnvelope = {
      version: 1,
      type: 'chat',
      msgId: codeMsg.msgId,
      senderUserId: codeMsg.senderUserId,
      senderDeviceId: codeMsg.senderDeviceId,
      groupId: GROUP,
      ts: codeMsg.createdAt,
      lamportTs: lamportTs2,
      payload: { message: codeMsg } satisfies ChatPayload,
      nonce: '',
      authTag: ''
    }

    await stubA.publish(codeEnvelope)
    await new Promise((r) => setTimeout(r, 500))

    if (receivedOnB.length !== 2) {
      throw new Error(`B expected 2 messages, got ${receivedOnB.length}`)
    }
    const codeContent = receivedOnB[1]?.content
    if (codeContent?.kind !== 'code' || codeContent.language !== 'python') {
      throw new Error('code message payload mismatch on B')
    }
  } finally {
    stubA.stop()
    stubB.stop()
    dbA.close()
    dbB.close()
    for (const d of _tempDirs) rmLanpmTemp(d)
  }
}

await runChatVerify()
console.log('OK: chat text + code send/receive, detectLanguage(python)')
