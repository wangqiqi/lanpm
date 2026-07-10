/**
 * TASK-147 — member_event dissolve：A publish → B 校验 payload 后本地清群。
 * 不 import groupService（会拉 electron/channels，strip-types 下无扩展名解析失败）。
 * Run: npm run verify:member-event
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import { NetworkStub } from '../../src/main/network/stub/NetworkStub.ts'
import {
  deleteGroupCascade,
  getGroupById,
  insertGroup
} from '../../src/main/storage/repositories/groupRepository.ts'
import { setMeta } from '../../src/main/storage/repositories/syncMetaRepository.ts'
import { upsertDevice } from '../../src/main/storage/repositories/deviceRepository.ts'
import { upsertUser } from '../../src/main/storage/repositories/userRepository.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'
import { isMemberEventPayload } from '../../src/shared/group/memberEvent.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const _tempDirs: string[] = []
const GROUP = 'grp_member_event_demo'

// --- static wiring (dissolve publish-first + peer handler) ---
const groupServiceSrc = readFileSync(join(projectRoot, 'src/main/group/groupService.ts'), 'utf8')
const memberEventSrc = readFileSync(
  join(projectRoot, 'src/main/group/memberEventService.ts'),
  'utf8'
)
const chatServiceSrc = readFileSync(join(projectRoot, 'src/main/chat/chatService.ts'), 'utf8')
assert.match(groupServiceSrc, /publishDissolveMemberEvent/)
assert.match(groupServiceSrc, /await publishDissolveMemberEvent/)
assert.match(memberEventSrc, /handleIncomingMemberEvent/)
assert.match(memberEventSrc, /applyRemoteGroupDissolved/)
assert.match(chatServiceSrc, /member_event/)
assert.match(chatServiceSrc, /handleIncomingMemberEvent/)

function seedDb(db: Database.Database, userId: string, deviceId: string, asOwner: boolean): void {
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
    name: 'Dissolve Demo',
    createdBy: asOwner ? userId : 'user_me_a',
    createdAt: now,
    autoDiscover: true
  })
}

function openDb(userId: string, deviceId: string, asOwner: boolean): Database.Database {
  const dir = mkLanpmTemp('lanpm-member-event-')
  _tempDirs.push(dir)
  const db = new Database(join(dir, 'test.db'))
  db.exec(schemaSql)
  seedDb(db, userId, deviceId, asOwner)
  return db
}

/** Mirror peer dissolve apply without Electron IPC. */
function applyPeerDissolve(db: Database.Database, envelope: SyncEnvelope): boolean {
  if (envelope.type !== 'member_event') return false
  if (!isMemberEventPayload(envelope.payload)) return false
  if (envelope.payload.action !== 'dissolve') return false
  const groupId = envelope.payload.groupId || envelope.groupId
  if (!groupId) return false
  if (!getGroupById(db, groupId)) return false
  deleteGroupCascade(db, groupId)
  return true
}

const dbA = openDb('user_me_a', 'dev_me_a', true)
const dbB = openDb('user_me_b', 'dev_me_b', false)

const stubA = new NetworkStub({
  deviceId: 'dev_me_a',
  userId: 'user_me_a',
  displayName: 'A'
})
const stubB = new NetworkStub({
  deviceId: 'dev_me_b',
  userId: 'user_me_b',
  displayName: 'B'
})

stubA.start()
stubB.start()
stubB.subscribe(GROUP, (env: SyncEnvelope) => {
  applyPeerDissolve(dbB, env)
})

try {
  if (!getGroupById(dbB, GROUP)) throw new Error('B missing group before dissolve')

  const now = new Date().toISOString()
  const payload = {
    action: 'dissolve' as const,
    groupId: GROUP,
    at: now,
    actorUserId: 'user_me_a'
  }
  if (!isMemberEventPayload(payload)) throw new Error('payload invalid')

  await stubA.publish({
    version: 1,
    type: 'member_event',
    msgId: `me_${Date.now()}`,
    senderUserId: 'user_me_a',
    senderDeviceId: 'dev_me_a',
    groupId: GROUP,
    ts: now,
    payload,
    nonce: '',
    authTag: ''
  })
  await new Promise((r) => setTimeout(r, 400))

  if (getGroupById(dbB, GROUP)) {
    throw new Error('B still has group after member_event dissolve')
  }

  // idempotent: second apply is no-op
  const again = applyPeerDissolve(dbB, {
    version: 1,
    type: 'member_event',
    msgId: 'me_again',
    senderUserId: 'user_me_a',
    senderDeviceId: 'dev_me_a',
    groupId: GROUP,
    ts: now,
    payload,
    nonce: '',
    authTag: ''
  })
  if (again) throw new Error('second apply should be no-op')
} finally {
  stubA.stop()
  stubB.stop()
  dbA.close()
  dbB.close()
  for (const d of _tempDirs) rmLanpmTemp(d)
}

console.log('verify:member-event OK')
