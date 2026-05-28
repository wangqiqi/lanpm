/**
 * M2-06 read receipt aggregation smoke.
 * Run: npm run verify:read-receipt
 */
import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { SyncEnvelope } from '../src/shared/network/types.ts'
import { isMessageReadByOthers } from '../src/shared/chat/readReceipt.ts'
import { NetworkStub } from '../src/main/network/stub/NetworkStub.ts'
import {
  getMessageById,
  insertMessage,
  updateDeliveryStatus
} from '../src/main/storage/repositories/messageRepository.ts'
import {
  listReaderUserIds,
  upsertReadReceipt
} from '../src/main/storage/repositories/readReceiptRepository.ts'

const root = dirname(fileURLToPath(import.meta.url))
const schemaSql = readFileSync(join(root, '../src/main/storage/schema.sql'), 'utf8')
const GROUP = 'verify-read-group'

function openDb(): Database.Database {
  const dir = mkdtempSync(join(tmpdir(), 'lanpm-read-'))
  const db = new Database(join(dir, 'test.db'))
  db.exec(schemaSql)
  return db
}

function applyReceipt(db: Database.Database, receipt: {
  msgId: string
  groupId: string
  readerUserId: string
  readerDeviceId: string
  readAt: string
}): void {
  upsertReadReceipt(db, receipt)
  const msg = getMessageById(db, receipt.msgId)
  if (!msg) return
  const readers = listReaderUserIds(db, receipt.msgId)
  if (isMessageReadByOthers(msg.senderUserId, readers)) {
    updateDeliveryStatus(db, receipt.msgId, 'read')
  }
}

if (!isMessageReadByOthers('user_a', ['user_b'])) {
  throw new Error('isMessageReadByOthers should be true')
}
if (isMessageReadByOthers('user_a', ['user_a'])) {
  throw new Error('sender self-read should not count')
}

const dbA = openDb()
const dbB = openDb()

const stubA = new NetworkStub({
  deviceId: 'dev_read_a',
  userId: 'user_read_a',
  displayName: 'Read A'
})
const stubB = new NetworkStub({
  deviceId: 'dev_read_b',
  userId: 'user_read_b',
  displayName: 'Read B'
})

stubA.start()
stubB.start()

const msgId = 'msg_read_verify'
const msg = {
  msgId,
  groupId: GROUP,
  senderUserId: 'user_read_a',
  senderDeviceId: 'dev_read_a',
  type: 'text' as const,
  content: { kind: 'text' as const, text: 'read me' },
  lamportTs: 1,
  createdAt: new Date().toISOString(),
  deliveryStatus: 'sent' as const
}
insertMessage(dbA, msg)

stubB.subscribeAll((env) => {
  if (env.type !== 'read_receipt') return
  const payload = env.payload as { receipt?: typeof msg & { readerUserId: string } }
  const receipt = (payload as { receipt: Parameters<typeof applyReceipt>[1] }).receipt
  if (receipt) applyReceipt(dbB, receipt)
})

stubA.subscribeAll((env) => {
  if (env.type !== 'read_receipt') return
  const payload = env.payload as { receipt: Parameters<typeof applyReceipt>[1] }
  if (payload.receipt) applyReceipt(dbA, payload.receipt)
})

try {
  const now = new Date().toISOString()
  const receipt = {
    msgId,
    groupId: GROUP,
    readerUserId: 'user_read_b',
    readerDeviceId: 'dev_read_b',
    readAt: now
  }

  upsertReadReceipt(dbB, receipt)

  const envelope: SyncEnvelope = {
    version: 1,
    type: 'read_receipt',
    msgId: `rr_${randomUUID()}`,
    senderUserId: receipt.readerUserId,
    senderDeviceId: receipt.readerDeviceId,
    groupId: GROUP,
    ts: now,
    payload: { receipt },
    nonce: '',
    authTag: ''
  }

  await stubB.publish(envelope)
  await new Promise((r) => setTimeout(r, 500))

  const onA = getMessageById(dbA, msgId)
  if (!onA || onA.deliveryStatus !== 'read') {
    throw new Error(`A expected read status, got ${onA?.deliveryStatus}`)
  }

  upsertReadReceipt(dbA, {
    ...receipt,
    readerDeviceId: 'dev_read_b_alt',
    readAt: new Date(Date.now() - 1000).toISOString()
  })
  upsertReadReceipt(dbA, {
    ...receipt,
    readerDeviceId: 'dev_read_b_alt2',
    readAt: new Date().toISOString()
  })
  const readers = listReaderUserIds(dbA, msgId)
  if (readers.length !== 1 || readers[0] !== 'user_read_b') {
    throw new Error(`userId aggregation failed: ${readers.join(',')}`)
  }
} finally {
  stubA.stop()
  stubB.stop()
  dbA.close()
  dbB.close()
}

console.log('OK: read receipt userId aggregation + NetworkStub sync')
