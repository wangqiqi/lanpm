/**
 * 入群申请 → 审批 → 加入闭环（仓储层 + 模拟 P2P 报文）。
 * 不 import joinRequestService（electron + 无扩展名解析在 strip-types 下失败）。
 * Run: npm run verify:join-request
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { applyMigrations } from '../../src/main/storage/migrate.ts'
import { rememberPeerGroups } from '../../src/main/discover/discoverGroupRegistry.ts'
import {
  getGroupById,
  insertGroup,
  insertGroupMember,
  listGroupMembers
} from '../../src/main/storage/repositories/groupRepository.ts'
import {
  getJoinRequest,
  getPendingJoinRequestId,
  hasPendingJoinRequest,
  insertJoinRequest,
  listPendingJoinRequestsForOwner,
  updateJoinRequestStatus
} from '../../src/main/storage/repositories/groupJoinRequestRepository.ts'
import {
  isJoinRequestDecisionPayload,
  isJoinRequestPayload
} from '../../src/shared/group/joinRequest.ts'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import { mkLanpmTemp } from '../lanpmTemp.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

// --- static wiring ---
const joinRequestSrc = readFileSync(join(projectRoot, 'src/main/group/joinRequestService.ts'), 'utf8')
const groupIpcSrc = readFileSync(join(projectRoot, 'src/main/ipc/group.ts'), 'utf8')
const chatSrc = readFileSync(join(projectRoot, 'src/main/chat/chatService.ts'), 'utf8')
const networkTypes = readFileSync(join(projectRoot, 'src/shared/network/types.ts'), 'utf8')

assert.match(joinRequestSrc, /requestJoinDiscoverableGroup/)
assert.match(joinRequestSrc, /handleIncomingJoinRequest/)
assert.match(joinRequestSrc, /handleIncomingJoinDecision/)
assert.match(joinRequestSrc, /initJoinRequestService/)
assert.match(groupIpcSrc, /requestJoinDiscoverableGroup/)
assert.match(chatSrc, /initJoinRequestService/)
assert.match(networkTypes, /join_request/)
assert.match(networkTypes, /join_request_decision/)

function openDb(label: string): Database.Database {
  const dir = mkLanpmTemp(`lanpm-join-req-${label}-`)
  const db = new Database(join(dir, 'test.db'))
  db.pragma('foreign_keys = ON')
  applyMigrations(db)
  return db
}

function seedUser(db: Database.Database, userId: string, displayName: string, deviceId: string): void {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO users (user_id, display_name, base_name, suffix, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?)`
  ).run(userId, displayName, displayName, now, now)
  db.prepare(`INSERT INTO devices (device_id, user_id, device_name, last_seen_at) VALUES (?, ?, ?, ?)`).run(
    deviceId,
    userId,
    'test-device',
    now
  )
  db.prepare(`INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('local_device_id', ?)`).run(deviceId)
}

/** 镜像 joinRequestService.handleIncomingJoinRequest（无 electron 广播） */
function applyIncomingJoinRequest(
  db: Database.Database,
  ownerUserId: string,
  localDeviceId: string,
  envelope: SyncEnvelope
): void {
  if (envelope.type !== 'join_request') return
  if (envelope.senderDeviceId === localDeviceId) return
  if (!isJoinRequestPayload(envelope.payload)) return

  const payload = envelope.payload
  if (payload.ownerUserId !== ownerUserId) return
  if (payload.applicantUserId === ownerUserId) return
  if (hasPendingJoinRequest(db, payload.groupId, payload.applicantUserId)) return

  insertJoinRequest(db, {
    requestId: payload.requestId,
    groupId: payload.groupId,
    applicantUserId: payload.applicantUserId,
    applicantDisplayName: payload.applicantDisplayName,
    ownerUserId: payload.ownerUserId,
    status: 'pending',
    createdAt: payload.at
  })
}

/** 镜像 joinRequestService.handleIncomingJoinDecision（批准路径） */
function applyIncomingJoinDecisionApproved(
  db: Database.Database,
  applicantUserId: string,
  localDeviceId: string,
  envelope: SyncEnvelope
): void {
  if (envelope.type !== 'join_request_decision') return
  if (envelope.senderDeviceId === localDeviceId) return
  if (!isJoinRequestDecisionPayload(envelope.payload)) return

  const payload = envelope.payload
  if (payload.applicantUserId !== applicantUserId) return
  if (!payload.approved) return

  const existing = getJoinRequest(db, payload.requestId)
  if (existing && existing.status !== 'pending') return

  const now = payload.at
  let group = getGroupById(db, payload.groupId)
  if (!group) {
    group = {
      groupId: payload.groupId,
      type: 'project',
      name: GROUP_NAME,
      createdBy: 'user_owner',
      createdAt: now,
      autoDiscover: true
    }
    insertGroup(db, group)
  }
  insertGroupMember(db, {
    groupId: payload.groupId,
    userId: applicantUserId,
    role: 'member',
    joinedAt: now,
    displayAlias: null
  })
  if (existing) {
    updateJoinRequestStatus(db, payload.requestId, 'approved', payload.actorUserId, now)
  }
}

const GROUP_ID = 'grp_join_req_test'
const GROUP_NAME = '审批测试群'

const dbOwner = openDb('owner')
const dbApplicant = openDb('applicant')

seedUser(dbOwner, 'user_owner', 'Owner', 'dev_owner')
seedUser(dbApplicant, 'user_applicant', 'Applicant', 'dev_applicant')

const now = new Date().toISOString()
dbOwner
  .prepare(
    `INSERT INTO groups (group_id, type, name, created_by, created_at, auto_discover)
     VALUES (?, 'project', ?, 'user_owner', ?, 1)`
  )
  .run(GROUP_ID, GROUP_NAME, now)
dbOwner
  .prepare(
    `INSERT INTO group_members (group_id, user_id, role, joined_at, display_alias)
     VALUES (?, 'user_owner', 'owner', ?, NULL)`
  )
  .run(GROUP_ID, now)

rememberPeerGroups('user_owner', 'Owner', [{ groupId: GROUP_ID, name: GROUP_NAME, type: 'project' }])

const requestId = 'jr_test_001'
const createdAt = new Date().toISOString()

insertJoinRequest(dbApplicant, {
  requestId,
  groupId: GROUP_ID,
  applicantUserId: 'user_applicant',
  applicantDisplayName: 'Applicant',
  ownerUserId: 'user_owner',
  status: 'pending',
  createdAt
})

const pendingId = getPendingJoinRequestId(dbApplicant, GROUP_ID, 'user_applicant')
assert.equal(pendingId, requestId)

const joinRequestEnvelope: SyncEnvelope = {
  version: 1,
  type: 'join_request',
  msgId: `jr_test_${requestId}`,
  senderUserId: 'user_applicant',
  senderDeviceId: 'dev_applicant_remote',
  ts: createdAt,
  payload: {
    requestId,
    groupId: GROUP_ID,
    groupName: GROUP_NAME,
    ownerUserId: 'user_owner',
    applicantUserId: 'user_applicant',
    applicantDisplayName: 'Applicant',
    at: createdAt
  },
  nonce: '',
  authTag: ''
}

applyIncomingJoinRequest(dbOwner, 'user_owner', 'dev_owner', joinRequestEnvelope)

const ownerPending = listPendingJoinRequestsForOwner(dbOwner, 'user_owner')
assert.equal(ownerPending.length, 1)

const approveAt = new Date().toISOString()
insertGroupMember(dbOwner, {
  groupId: GROUP_ID,
  userId: 'user_applicant',
  role: 'member',
  joinedAt: approveAt,
  displayAlias: null
})
updateJoinRequestStatus(dbOwner, requestId, 'approved', 'user_owner', approveAt)

const decisionEnvelope: SyncEnvelope = {
  version: 1,
  type: 'join_request_decision',
  msgId: `jrd_test_${requestId}`,
  senderUserId: 'user_owner',
  senderDeviceId: 'dev_owner_remote',
  ts: approveAt,
  payload: {
    requestId,
    groupId: GROUP_ID,
    applicantUserId: 'user_applicant',
    approved: true,
    at: approveAt,
    actorUserId: 'user_owner'
  },
  nonce: '',
  authTag: ''
}

applyIncomingJoinDecisionApproved(dbApplicant, 'user_applicant', 'dev_applicant', decisionEnvelope)

const ownerMembers = listGroupMembers(dbOwner, GROUP_ID).map((m) => m.userId)
const applicantMembers = listGroupMembers(dbApplicant, GROUP_ID).map((m) => m.userId)

assert.ok(ownerMembers.includes('user_applicant'), 'owner DB should include applicant after approve')
assert.ok(applicantMembers.includes('user_applicant'), 'applicant DB should include self after decision')

assert.ok(
  hasPendingJoinRequest(dbApplicant, GROUP_ID, 'user_applicant') === false,
  'approved request should not stay pending'
)

dbOwner.close()
dbApplicant.close()

console.log('verify:join-request OK')
