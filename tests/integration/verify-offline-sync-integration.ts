/**
 * AUTO-13 — 离线补同步集成：chat_sync_request → chat_sync_batch → SQLite 落库 + TTL 过滤。
 * Run: npm run verify:offline-sync-integration
 */
import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import type { ChatMessage } from '../../src/shared/chat/types.ts'
import {
  OFFLINE_SYNC_BATCH_LIMIT,
  offlineSyncCutoffIso,
  type ChatSyncBatchPayload,
  type ChatSyncRequestPayload
} from '../../src/shared/chat/offlineSync.ts'
import { NetworkStub } from '../../src/main/network/stub/NetworkStub.ts'
import { insertGroup } from '../../src/main/storage/repositories/groupRepository.ts'
import { setMeta } from '../../src/main/storage/repositories/syncMetaRepository.ts'
import { upsertDevice } from '../../src/main/storage/repositories/deviceRepository.ts'
import { upsertUser } from '../../src/main/storage/repositories/userRepository.ts'
import {
  insertMessage,
  listMessagesByGroup,
  listMessagesSince,
  messageExists
} from '../../src/main/storage/repositories/messageRepository.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const GROUP = 'demo-offline-sync'
const DEVICE_A = 'dev_off_a'
const DEVICE_B = 'dev_off_b'
const DEVICE_REMOTE = 'dev_remote'
const USER_A = 'user_off_a'
const USER_B = 'user_off_b'
const USER_REMOTE = 'user_remote'

function openDb(userId: string, deviceId: string): Database.Database {
  const dir = mkdtempSync(join(tmpdir(), 'lanpm-offline-sync-'))
  const db = new Database(join(dir, 'test.db'))
  db.exec(schemaSql)
  const now = new Date().toISOString()
  upsertUser(db, {
    userId,
    displayName: userId,
    baseName: userId.slice(0, 8),
    suffix: 1,
    createdAt: now,
    updatedAt: now
  })
  upsertDevice(db, { deviceId, deviceName: 'verify', userId, lastSeenAt: now })
  setMeta(db, 'local_device_id', deviceId)
  insertGroup(db, {
    groupId: GROUP,
    type: 'project',
    name: 'Offline Sync',
    createdBy: userId,
    createdAt: now,
    autoDiscover: true
  })
  return db
}

function buildMessage(
  msgId: string,
  senderUserId: string,
  senderDeviceId: string,
  createdAt: string,
  lamportTs: number
): ChatMessage {
  return {
    msgId,
    groupId: GROUP,
    senderUserId,
    senderDeviceId,
    type: 'text',
    content: { kind: 'text', text: msgId },
    lamportTs,
    createdAt,
    deliveryStatus: 'sent'
  }
}

/** Mirrors offlineSyncService.handleChatSyncRequest (responder side). */
async function respondToSyncRequest(
  db: Database.Database,
  stub: NetworkStub,
  localDeviceId: string,
  localUserId: string,
  envelope: SyncEnvelope
): Promise<void> {
  if (envelope.type !== 'chat_sync_request' || !envelope.groupId) return
  if (envelope.senderDeviceId === localDeviceId) return

  const payload = envelope.payload as ChatSyncRequestPayload
  if (!payload?.minCreatedAt) return

  const messages = listMessagesSince(
    db,
    envelope.groupId,
    payload.sinceLamportTs ?? 0,
    payload.minCreatedAt,
    OFFLINE_SYNC_BATCH_LIMIT
  ).filter((m) => m.senderDeviceId !== localDeviceId)

  if (messages.length === 0) return

  const batchPayload: ChatSyncBatchPayload = { messages }
  await stub.publish({
    version: 1,
    type: 'chat_sync_batch',
    msgId: `sync_batch_${envelope.groupId}_${randomUUID()}`,
    senderUserId: localUserId,
    senderDeviceId: localDeviceId,
    groupId: envelope.groupId,
    ts: new Date().toISOString(),
    payload: batchPayload,
    nonce: '',
    authTag: ''
  })
}

/** Mirrors offlineSyncService.handleChatSyncBatch (requester side). */
function applySyncBatch(
  db: Database.Database,
  localDeviceId: string,
  envelope: SyncEnvelope
): void {
  if (envelope.type !== 'chat_sync_batch' || !envelope.groupId) return
  if (envelope.senderDeviceId === localDeviceId) return

  const payload = envelope.payload as ChatSyncBatchPayload
  if (!Array.isArray(payload?.messages)) return

  const cutoff = offlineSyncCutoffIso(7)
  for (const incoming of payload.messages) {
    if (!incoming?.msgId || incoming.createdAt < cutoff) continue
    if (messageExists(db, incoming.msgId)) continue
    insertMessage(db, { ...incoming, groupId: envelope.groupId, deliveryStatus: 'sent' })
  }
}

const dbA = openDb(USER_A, DEVICE_A)
const dbB = openDb(USER_B, DEVICE_B)

const minCreatedAt = offlineSyncCutoffIso(7)
const staleAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
const freshAt = new Date().toISOString()

const freshMsg = buildMessage(`msg_fresh_${randomUUID()}`, USER_REMOTE, DEVICE_REMOTE, freshAt, 2)
const staleMsg = buildMessage(`msg_stale_${randomUUID()}`, USER_REMOTE, DEVICE_REMOTE, staleAt, 1)
const ownMsg = buildMessage(`msg_own_${randomUUID()}`, USER_A, DEVICE_A, freshAt, 3)

insertMessage(dbA, freshMsg)
insertMessage(dbA, staleMsg)
insertMessage(dbA, ownMsg)

const stubA = new NetworkStub({
  deviceId: DEVICE_A,
  userId: USER_A,
  displayName: 'Offline A'
})
const stubB = new NetworkStub({
  deviceId: DEVICE_B,
  userId: USER_B,
  displayName: 'Offline B'
})

stubA.start()
stubB.start()

stubA.subscribe(GROUP, (env) => {
  void respondToSyncRequest(dbA, stubA, DEVICE_A, USER_A, env)
})

let batchReceived = false
stubB.subscribe(GROUP, (env) => {
  if (env.type === 'chat_sync_batch') {
    applySyncBatch(dbB, DEVICE_B, env)
    batchReceived = true
  }
})

try {
  const request: SyncEnvelope = {
    version: 1,
    type: 'chat_sync_request',
    msgId: `sync_req_${randomUUID()}`,
    senderUserId: USER_B,
    senderDeviceId: DEVICE_B,
    groupId: GROUP,
    ts: freshAt,
    payload: { sinceLamportTs: 0, minCreatedAt },
    nonce: '',
    authTag: ''
  }

  await stubB.publish(request)

  const deadline = Date.now() + 3000
  while (!batchReceived && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50))
  }
  if (!batchReceived) {
    throw new Error('chat_sync_batch not received on stub B within 3s')
  }

  const onB = listMessagesByGroup(dbB, GROUP)
  if (onB.length !== 1) {
    throw new Error(`expected 1 message on B, got ${onB.length}`)
  }
  if (onB[0]?.msgId !== freshMsg.msgId) {
    throw new Error('B received wrong message (TTL filter failed)')
  }
  if (messageExists(dbB, staleMsg.msgId)) {
    throw new Error('stale message should not sync to B')
  }
  if (messageExists(dbB, ownMsg.msgId)) {
    throw new Error('responder must not echo own-device messages in sync batch')
  }
} finally {
  stubB.stop()
  stubA.stop()
  dbA.close()
  dbB.close()
}

console.log('verify:offline-sync-integration OK (request → batch → TTL)')
