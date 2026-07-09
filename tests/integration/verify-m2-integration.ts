/**
 * M2-07 / M2-08 integration smoke (read receipt + /task + task persist).
 * Run: npm run verify:m2-integration
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import type { ChatMessage, ChatPayload } from '../../src/shared/chat/types.ts'
import { parseTaskCommand } from '../../src/shared/chat/taskCommand.ts'
import { isMessageReadByOthers } from '../../src/shared/chat/readReceipt.ts'
import { NetworkStub } from '../../src/main/network/stub/NetworkStub.ts'
import {
  getMessageById,
  insertMessage,
  listMessagesByGroup,
  messageExists,
  updateDeliveryStatus
} from '../../src/main/storage/repositories/messageRepository.ts'
import {
  listReaderUserIds,
  upsertReadReceipt
} from '../../src/main/storage/repositories/readReceiptRepository.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'
import {
  buildTaskFromInput,
  getMaxSortOrderInColumn,
  insertTask,
  listTasksByGroup
} from '../../src/main/storage/repositories/taskRepository.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const _tempDirs: string[] = []
const GROUP = 'demo-project'

function openDb(): Database.Database {
  const dir = mkLanpmTemp('lanpm-m2-int-')
  _tempDirs.push(dir)
  const db = new Database(join(dir, 'test.db'))
  db.exec(schemaSql)
  return db
}

function applyReceipt(
  db: Database.Database,
  receipt: {
    msgId: string
    groupId: string
    readerUserId: string
    readerDeviceId: string
    readAt: string
  }
): void {
  upsertReadReceipt(db, receipt)
  const msg = getMessageById(db, receipt.msgId)
  if (!msg) return
  if (isMessageReadByOthers(msg.senderUserId, listReaderUserIds(db, receipt.msgId))) {
    updateDeliveryStatus(db, receipt.msgId, 'read')
  }
}

function handleChat(db: Database.Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'chat' || !envelope.groupId) return
  const incoming = (envelope.payload as ChatPayload).message
  if (!incoming?.msgId || messageExists(db, incoming.msgId)) return
  insertMessage(db, { ...incoming, groupId: envelope.groupId, deliveryStatus: 'sent' })
}

const parsed = parseTaskCommand('/task Fix login UI')
if (!parsed || parsed.title !== 'Fix login UI') {
  throw new Error('parseTaskCommand failed')
}
if (parseTaskCommand('/task')?.title !== '') {
  throw new Error('parseTaskCommand bare /task failed')
}

const dbA = openDb()
const dbB = openDb()

const stubA = new NetworkStub({
  deviceId: 'dev_m2_a',
  userId: 'user_m2_a',
  displayName: 'M2 A'
})
const stubB = new NetworkStub({
  deviceId: 'dev_m2_b',
  userId: 'user_m2_b',
  displayName: 'M2 B'
})

stubA.start()
stubB.start()

stubA.subscribeAll((env) => {
  if (env.type === 'read_receipt') {
    const payload = env.payload as { receipt: Parameters<typeof applyReceipt>[1] }
    if (payload.receipt) applyReceipt(dbA, payload.receipt)
  }
})
stubB.subscribe(GROUP, (env) => handleChat(dbB, env))

try {
  const msgId = `msg_${randomUUID()}`
  const chatMsg: ChatMessage = {
    msgId,
    groupId: GROUP,
    senderUserId: 'user_m2_a',
    senderDeviceId: 'dev_m2_a',
    type: 'text',
    content: { kind: 'text', text: 'dual instance hello' },
    lamportTs: 1,
    createdAt: new Date().toISOString(),
    deliveryStatus: 'sent'
  }
  insertMessage(dbA, chatMsg)

  await stubA.publish({
    version: 1,
    type: 'chat',
    msgId,
    senderUserId: chatMsg.senderUserId,
    senderDeviceId: chatMsg.senderDeviceId,
    groupId: GROUP,
    ts: chatMsg.createdAt,
    lamportTs: 1,
    payload: { message: chatMsg },
    nonce: '',
    authTag: ''
  })
  await new Promise((r) => setTimeout(r, 500))

  if (listMessagesByGroup(dbB, GROUP).length !== 1) {
    throw new Error('B did not receive chat message')
  }

  const readAt = new Date().toISOString()
  await stubB.publish({
    version: 1,
    type: 'read_receipt',
    msgId: `rr_${randomUUID()}`,
    senderUserId: 'user_m2_b',
    senderDeviceId: 'dev_m2_b',
    groupId: GROUP,
    ts: readAt,
    payload: {
      receipt: {
        msgId,
        groupId: GROUP,
        readerUserId: 'user_m2_b',
        readerDeviceId: 'dev_m2_b',
        readAt
      }
    },
    nonce: '',
    authTag: ''
  })
  await new Promise((r) => setTimeout(r, 500))

  const onA = getMessageById(dbA, msgId)
  if (onA?.deliveryStatus !== 'read') {
    throw new Error(`read receipt sync failed: ${onA?.deliveryStatus}`)
  }

  const task = buildTaskFromInput(
    { groupId: GROUP, title: 'Task from chat', status: 'todo' },
    'user_m2_a',
    `task_${randomUUID()}`
  )
  task.sortOrder = getMaxSortOrderInColumn(dbA, GROUP, 'todo') + 1
  insertTask(dbA, task)

  const taskMsg: ChatMessage = {
    msgId: `msg_${randomUUID()}`,
    groupId: GROUP,
    senderUserId: 'user_m2_a',
    senderDeviceId: 'dev_m2_a',
    type: 'task_ref',
    content: { kind: 'task_ref', taskId: task.taskId, title: task.title },
    lamportTs: 2,
    createdAt: new Date().toISOString(),
    deliveryStatus: 'sent'
  }
  insertMessage(dbA, taskMsg)

  const tasks = listTasksByGroup(dbA, GROUP)
  if (tasks.length !== 1 || tasks[0]?.title !== 'Task from chat') {
    throw new Error('task from /task flow not persisted')
  }
} finally {
  stubA.stop()
  stubB.stop()
  dbA.close()
  dbB.close()
  for (const d of _tempDirs) rmLanpmTemp(d)
}

console.log('OK: M2 integration chat + read receipt + task')
