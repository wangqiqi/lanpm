/**
 * TASK-4104 — 群标签离线补拉：B 离线时 A 改字典 → B request → A batch → B LWW 色板一致。
 * 不 import main task services（electron/channels 在 strip-types 下易挂）。
 * Run: npm run verify:group-tag-offline
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import {
  isGroupTagSyncBatchPayload,
  isGroupTagSyncRequestPayload,
  maxUpdatedAtInGroupTags,
  splitGroupTagOfflineSyncPage,
  type GroupTagMeta
} from '../../src/shared/task/groupTagMeta.ts'
import { NetworkStub } from '../../src/main/network/stub/NetworkStub.ts'
import {
  applyRemoteGroupTagUpsert,
  listGroupTagMeta,
  listGroupTagsSince,
  upsertGroupTagMeta
} from '../../src/main/storage/repositories/groupTagMetaRepository.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const _tempDirs: string[] = []
const GROUP = 'grp_gt_offline'

const taskSyncSrc = readFileSync(join(projectRoot, 'src/main/task/taskSyncService.ts'), 'utf8')
const offlineSrc = readFileSync(
  join(projectRoot, 'src/main/task/groupTagOfflineSyncService.ts'),
  'utf8'
)
assert.match(taskSyncSrc, /group_tag_sync_request/)
assert.match(taskSyncSrc, /requestGroupTagOfflineSync/)
assert.match(offlineSrc, /handleGroupTagSyncRequest/)
assert.match(offlineSrc, /handleGroupTagSyncBatch/)

function openDb(): Database.Database {
  const dir = mkLanpmTemp('lanpm-gt-offline-')
  _tempDirs.push(dir)
  const db = new Database(join(dir, 'test.db'))
  db.exec(schemaSql)
  return db
}

async function respondToRequest(
  db: Database.Database,
  stub: NetworkStub,
  localUserId: string,
  localDeviceId: string,
  envelope: SyncEnvelope
): Promise<void> {
  if (envelope.type !== 'group_tag_sync_request' || !envelope.groupId) return
  if (!isGroupTagSyncRequestPayload(envelope.payload)) return
  if (envelope.senderDeviceId === localDeviceId) return

  let sinceUpdatedAt = envelope.payload.sinceUpdatedAt
  const minUpdatedAt = envelope.payload.minUpdatedAt
  for (let page = 0; page < 5; page++) {
    const raw = listGroupTagsSince(db, envelope.groupId, sinceUpdatedAt, minUpdatedAt, 201)
    const { tags, hasMore } = splitGroupTagOfflineSyncPage(raw, 200)
    if (tags.length > 0) {
      await stub.publish({
        version: 1,
        type: 'group_tag_sync_batch',
        msgId: `gt_batch_${randomUUID()}`,
        senderUserId: localUserId,
        senderDeviceId: localDeviceId,
        groupId: envelope.groupId,
        ts: new Date().toISOString(),
        payload: { tags, hasMore },
        nonce: '',
        authTag: ''
      })
    }
    if (!hasMore || tags.length === 0) break
    sinceUpdatedAt = maxUpdatedAtInGroupTags(tags)
  }
}

const dbA = openDb()
const dbB = openDb()
const DEVICE_A = 'dev_gt_a'
const DEVICE_B = 'dev_gt_b'
const USER_A = 'user_gt_a'
const USER_B = 'user_gt_b'

const stubA = new NetworkStub({ deviceId: DEVICE_A, userId: USER_A, displayName: 'A' })
const stubB = new NetworkStub({ deviceId: DEVICE_B, userId: USER_B, displayName: 'B' })
stubA.start()
stubB.start()

const now = new Date().toISOString()
const tag: GroupTagMeta = {
  groupId: GROUP,
  tagKey: 'api',
  color: '#112233',
  updatedAt: now,
  updatedByUserId: USER_A,
  label: 'API'
}
upsertGroupTagMeta(dbA, tag)

stubA.subscribe(GROUP, (env) => {
  void respondToRequest(dbA, stubA, USER_A, DEVICE_A, env)
})
stubB.subscribe(GROUP, (env) => {
  if (env.type !== 'group_tag_sync_batch' || !env.groupId) return
  if (!isGroupTagSyncBatchPayload(env.payload)) return
  for (const row of env.payload.tags) {
    applyRemoteGroupTagUpsert(dbB, { ...row, groupId: env.groupId })
  }
})

try {
  assert.equal(listGroupTagMeta(dbB, GROUP).length, 0, 'B should start with empty dict')

  await stubB.publish({
    version: 1,
    type: 'group_tag_sync_request',
    msgId: `gt_req_${randomUUID()}`,
    senderUserId: USER_B,
    senderDeviceId: DEVICE_B,
    groupId: GROUP,
    ts: now,
    payload: { sinceUpdatedAt: '', minUpdatedAt: '2020-01-01T00:00:00.000Z' },
    nonce: '',
    authTag: ''
  })

  await new Promise((r) => setTimeout(r, 500))

  const after = listGroupTagMeta(dbB, GROUP)
  assert.equal(after.length, 1, `B expected 1 tag, got ${after.length}`)
  assert.equal(after[0]?.tagKey, 'api')
  assert.equal(after[0]?.color, '#112233')
  console.log('OK: group_tag offline sync restored dictionary color')
} finally {
  stubA.stop()
  stubB.stop()
  dbA.close()
  dbB.close()
  for (const d of _tempDirs) rmLanpmTemp(d)
}

console.log('verify:group-tag-offline OK')
