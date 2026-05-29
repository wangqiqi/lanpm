/**
 * AUTO-10 — 单机双 NetworkStub + 双库：chat → read_receipt → task_patch 闭环。
 * Run: npm run verify:dual-stub
 */
import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import type { ChatMessage, ChatPayload } from '../../src/shared/chat/types.ts'
import type { TaskPatchPayload } from '../../src/shared/task/sync.ts'
import type { Task } from '../../src/shared/task/types.ts'
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
import {
  buildTaskFromInput,
  getMaxSortOrderInColumn,
  insertTask,
  listTasksByGroup,
  upsertTaskFromRemote
} from '../../src/main/storage/repositories/taskRepository.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const GROUP = 'demo-dual-stub'

function openDb(): Database.Database {
  const dir = mkdtempSync(join(tmpdir(), 'lanpm-dual-'))
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

function applyTaskPatch(db: Database.Database, localDeviceId: string, envelope: SyncEnvelope): void {
  if (envelope.type !== 'task_patch' || !envelope.groupId) return
  if (envelope.senderDeviceId === localDeviceId) return
  const payload = envelope.payload as TaskPatchPayload
  if (!payload?.task?.taskId) return
  const task: Task = { ...payload.task, groupId: envelope.groupId }
  upsertTaskFromRemote(db, task)
}

const dbA = openDb()
const dbB = openDb()

const stubA = new NetworkStub({
  deviceId: 'dev_dual_a',
  userId: 'user_dual_a',
  displayName: 'Dual A'
})
const stubB = new NetworkStub({
  deviceId: 'dev_dual_b',
  userId: 'user_dual_b',
  displayName: 'Dual B'
})

stubA.start()
stubB.start()

stubA.subscribeAll((env) => {
  if (env.type === 'read_receipt') {
    const payload = env.payload as { receipt: Parameters<typeof applyReceipt>[1] }
    if (payload.receipt) applyReceipt(dbA, payload.receipt)
  }
})
stubB.subscribe(GROUP, (env) => {
  handleChat(dbB, env)
  applyTaskPatch(dbB, 'dev_dual_b', env)
})

try {
  const peersA = await stubA.discoverPeers()
  const peersB = await stubB.discoverPeers()
  if (!peersA.some((p) => p.deviceId === 'dev_dual_b')) {
    throw new Error('A did not discover B')
  }
  if (!peersB.some((p) => p.deviceId === 'dev_dual_a')) {
    throw new Error('B did not discover A')
  }

  const msgId = `msg_${randomUUID()}`
  const chatMsg: ChatMessage = {
    msgId,
    groupId: GROUP,
    senderUserId: 'user_dual_a',
    senderDeviceId: 'dev_dual_a',
    type: 'text',
    content: { kind: 'text', text: 'dual stub hello' },
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
    throw new Error('B did not receive chat')
  }

  const readAt = new Date().toISOString()
  await stubB.publish({
    version: 1,
    type: 'read_receipt',
    msgId: `rr_${randomUUID()}`,
    senderUserId: 'user_dual_b',
    senderDeviceId: 'dev_dual_b',
    groupId: GROUP,
    ts: readAt,
    payload: {
      receipt: {
        msgId,
        groupId: GROUP,
        readerUserId: 'user_dual_b',
        readerDeviceId: 'dev_dual_b',
        readAt
      }
    },
    nonce: '',
    authTag: ''
  })
  await new Promise((r) => setTimeout(r, 500))

  if (getMessageById(dbA, msgId)?.deliveryStatus !== 'read') {
    throw new Error('read receipt not synced to A')
  }

  const task = buildTaskFromInput(
    { groupId: GROUP, title: 'Dual stub task', status: 'todo' },
    'user_dual_a',
    `task_${randomUUID()}`
  )
  task.sortOrder = getMaxSortOrderInColumn(dbA, GROUP, 'todo') + 1
  insertTask(dbA, task)

  await stubA.publish({
    version: 1,
    type: 'task_patch',
    msgId: `tp_${randomUUID()}`,
    senderUserId: 'user_dual_a',
    senderDeviceId: 'dev_dual_a',
    groupId: GROUP,
    ts: new Date().toISOString(),
    payload: { action: 'upsert', task },
    nonce: '',
    authTag: ''
  })
  await new Promise((r) => setTimeout(r, 500))

  const onB = listTasksByGroup(dbB, GROUP)
  if (onB.length !== 1 || onB[0]?.title !== 'Dual stub task') {
    throw new Error('task_patch not synced to B')
  }
} finally {
  stubA.stop()
  stubB.stop()
  dbA.close()
  dbB.close()
}

console.log('verify:dual-stub OK (discover + chat + read_receipt + task_patch)')
