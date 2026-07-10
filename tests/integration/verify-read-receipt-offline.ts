/**
 * TASK-154 — 已读离线补拉：B request → A batch → B upsert 后 deliveryStatus=read。
 * 不 import main chat services（electron/channels 无扩展名在 strip-types 下失败）。
 * Run: npm run verify:read-receipt-offline
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import {
  isMessageReadByOthers,
  isReadReceiptSyncBatchPayload,
  isReadReceiptSyncRequestPayload,
  maxReadAtInReceipts,
  splitReadReceiptOfflineSyncPage,
  type ReadReceipt
} from '../../src/shared/chat/readReceipt.ts'
import { NetworkStub } from '../../src/main/network/stub/NetworkStub.ts'
import {
  getMessageById,
  insertMessage,
  updateDeliveryStatus
} from '../../src/main/storage/repositories/messageRepository.ts'
import {
  listReadReceiptsSince,
  listReaderUserIds,
  upsertReadReceipt
} from '../../src/main/storage/repositories/readReceiptRepository.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const _tempDirs: string[] = []
const GROUP = 'grp_rr_offline'

// --- static wiring ---
const chatSrc = readFileSync(join(projectRoot, 'src/main/chat/chatService.ts'), 'utf8')
const offlineSrc = readFileSync(
  join(projectRoot, 'src/main/chat/readReceiptOfflineSyncService.ts'),
  'utf8'
)
assert.match(chatSrc, /read_receipt_sync_request/)
assert.match(chatSrc, /requestReadReceiptOfflineSync/)
assert.match(offlineSrc, /handleReadReceiptSyncRequest/)
assert.match(offlineSrc, /handleReadReceiptSyncBatch/)

function openDb(): Database.Database {
  const dir = mkLanpmTemp('lanpm-rr-offline-')
  _tempDirs.push(dir)
  const db = new Database(join(dir, 'test.db'))
  db.exec(schemaSql)
  return db
}

function applyReceiptLocal(db: Database.Database, receipt: ReadReceipt): void {
  upsertReadReceipt(db, receipt)
  const msg = getMessageById(db, receipt.msgId)
  if (!msg) return
  if (isMessageReadByOthers(msg.senderUserId, listReaderUserIds(db, receipt.msgId))) {
    updateDeliveryStatus(db, receipt.msgId, 'read')
  }
}

async function respondToRequest(
  db: Database.Database,
  stub: NetworkStub,
  localUserId: string,
  localDeviceId: string,
  envelope: SyncEnvelope
): Promise<void> {
  if (envelope.type !== 'read_receipt_sync_request' || !envelope.groupId) return
  if (!isReadReceiptSyncRequestPayload(envelope.payload)) return
  if (envelope.senderDeviceId === localDeviceId) return

  let sinceReadAt = envelope.payload.sinceReadAt
  const minReadAt = envelope.payload.minReadAt
  for (let page = 0; page < 5; page++) {
    const raw = listReadReceiptsSince(db, envelope.groupId, sinceReadAt, minReadAt, 101)
    const { receipts, hasMore } = splitReadReceiptOfflineSyncPage(raw, 100)
    const pageReceipts = receipts.filter((r) => r.readerDeviceId !== envelope.senderDeviceId)
    if (pageReceipts.length > 0) {
      await stub.publish({
        version: 1,
        type: 'read_receipt_sync_batch',
        msgId: `rr_batch_${randomUUID()}`,
        senderUserId: localUserId,
        senderDeviceId: localDeviceId,
        groupId: envelope.groupId,
        ts: new Date().toISOString(),
        payload: { receipts: pageReceipts, hasMore },
        nonce: '',
        authTag: ''
      })
    }
    if (!hasMore || receipts.length === 0) break
    sinceReadAt = maxReadAtInReceipts(receipts)
  }
}

const dbA = openDb()
const dbB = openDb()
const DEVICE_A = 'dev_rr_a'
const DEVICE_B = 'dev_rr_b'
const USER_A = 'user_rr_a'
const USER_B = 'user_rr_b'

const stubA = new NetworkStub({ deviceId: DEVICE_A, userId: USER_A, displayName: 'A' })
const stubB = new NetworkStub({ deviceId: DEVICE_B, userId: USER_B, displayName: 'B' })
stubA.start()
stubB.start()

const msgId = 'msg_rr_offline'
const now = new Date().toISOString()
const msg = {
  msgId,
  groupId: GROUP,
  senderUserId: USER_B,
  senderDeviceId: DEVICE_B,
  type: 'text' as const,
  content: { kind: 'text' as const, text: 'please read' },
  lamportTs: 1,
  createdAt: now,
  deliveryStatus: 'sent' as const
}
insertMessage(dbA, msg)
insertMessage(dbB, { ...msg, deliveryStatus: 'sent' })

// A read B's message while B was offline — only A has the receipt.
const receipt: ReadReceipt = {
  msgId,
  groupId: GROUP,
  readerUserId: USER_A,
  readerDeviceId: DEVICE_A,
  readAt: now
}
upsertReadReceipt(dbA, receipt)
updateDeliveryStatus(dbA, msgId, 'read')

stubA.subscribe(GROUP, (env) => {
  void respondToRequest(dbA, stubA, USER_A, DEVICE_A, env)
})
stubB.subscribe(GROUP, (env) => {
  if (env.type !== 'read_receipt_sync_batch' || !env.groupId) return
  if (!isReadReceiptSyncBatchPayload(env.payload)) return
  for (const r of env.payload.receipts) {
    applyReceiptLocal(dbB, { ...r, groupId: env.groupId })
  }
})

try {
  if (getMessageById(dbB, msgId)?.deliveryStatus === 'read') {
    throw new Error('B should start unread')
  }

  await stubB.publish({
    version: 1,
    type: 'read_receipt_sync_request',
    msgId: `rr_req_${randomUUID()}`,
    senderUserId: USER_B,
    senderDeviceId: DEVICE_B,
    groupId: GROUP,
    ts: now,
    payload: { sinceReadAt: '', minReadAt: '2020-01-01T00:00:00.000Z' },
    nonce: '',
    authTag: ''
  })

  await new Promise((r) => setTimeout(r, 500))

  const after = getMessageById(dbB, msgId)
  if (after?.deliveryStatus !== 'read') {
    throw new Error(`B expected deliveryStatus=read, got ${after?.deliveryStatus}`)
  }
  if (!listReaderUserIds(dbB, msgId).includes(USER_A)) {
    throw new Error('B missing A read receipt after sync')
  }
  console.log('OK: read_receipt offline sync restored deliveryStatus=read')
} finally {
  stubA.stop()
  stubB.stop()
  dbA.close()
  dbB.close()
  for (const d of _tempDirs) rmLanpmTemp(d)
}

console.log('verify:read-receipt-offline OK')
