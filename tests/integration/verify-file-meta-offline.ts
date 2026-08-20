/**
 * TASK-4804 — 文件库索引离线补拉：B 离线时 A 上传 → B request → A batch → B 见 remote-pending。
 * 不 import fileSyncService（electron 在 strip-types 下易挂）。
 * Run: npm run verify:file-meta-offline
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import {
  isFileMetaSyncBatchPayload,
  isFileMetaSyncRequestPayload,
  maxUpdatedAtInFileMetas,
  REMOTE_PENDING_PREFIX,
  splitFileMetaOfflineSyncPage,
  toFileMetaSyncWire
} from '../../src/shared/file/sync.ts'
import type { FileMeta } from '../../src/shared/file/types.ts'
import { NetworkStub } from '../../src/main/network/stub/NetworkStub.ts'
import { insertGroup } from '../../src/main/storage/repositories/groupRepository.ts'
import {
  getFileById,
  insertFile,
  listFileMetaSince,
  listFilesByGroup,
  upsertRemoteFileMeta
} from '../../src/main/storage/repositories/fileRepository.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const _tempDirs: string[] = []
const GROUP = 'grp_fm_offline'

const fileSyncSrc = readFileSync(join(projectRoot, 'src/main/file/fileSyncService.ts'), 'utf8')
const offlineSrc = readFileSync(
  join(projectRoot, 'src/main/file/fileMetaOfflineSyncService.ts'),
  'utf8'
)
assert.match(fileSyncSrc, /file_meta_sync_request/)
assert.match(fileSyncSrc, /requestFileMetaOfflineSync/)
assert.match(offlineSrc, /handleFileMetaSyncRequest/)
assert.match(offlineSrc, /handleFileMetaSyncBatch/)

function openDb(): Database.Database {
  const dir = mkLanpmTemp('lanpm-fm-offline-')
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
  if (envelope.type !== 'file_meta_sync_request' || !envelope.groupId) return
  if (!isFileMetaSyncRequestPayload(envelope.payload)) return
  if (envelope.senderDeviceId === localDeviceId) return

  let sinceUpdatedAt = envelope.payload.sinceUpdatedAt
  const minUpdatedAt = envelope.payload.minUpdatedAt
  for (let page = 0; page < 5; page++) {
    const raw = listFileMetaSince(db, envelope.groupId, sinceUpdatedAt, minUpdatedAt, 81)
    const { files, hasMore } = splitFileMetaOfflineSyncPage(raw, 80)
    if (files.length > 0) {
      await stub.publish({
        version: 1,
        type: 'file_meta_sync_batch',
        msgId: `fm_batch_${randomUUID()}`,
        senderUserId: localUserId,
        senderDeviceId: localDeviceId,
        groupId: envelope.groupId,
        ts: new Date().toISOString(),
        payload: { files: files.map(toFileMetaSyncWire), hasMore },
        nonce: '',
        authTag: ''
      })
    }
    if (!hasMore || files.length === 0) break
    sinceUpdatedAt = maxUpdatedAtInFileMetas(files)
  }
}

const dbA = openDb()
const dbB = openDb()
const DEVICE_A = 'dev_fm_a'
const DEVICE_B = 'dev_fm_b'
const USER_A = 'user_fm_a'
const USER_B = 'user_fm_b'

const stubA = new NetworkStub({ deviceId: DEVICE_A, userId: USER_A, displayName: 'A' })
const stubB = new NetworkStub({ deviceId: DEVICE_B, userId: USER_B, displayName: 'B' })
stubA.start()
stubB.start()

const now = new Date().toISOString()
insertGroup(dbA, {
  groupId: GROUP,
  type: 'project',
  name: 'Files',
  createdBy: USER_A,
  createdAt: now,
  autoDiscover: true
})
insertGroup(dbB, {
  groupId: GROUP,
  type: 'project',
  name: 'Files',
  createdBy: USER_B,
  createdAt: now,
  autoDiscover: true
})

const meta: FileMeta = {
  fileId: 'file_offline_1',
  groupId: GROUP,
  name: 'spec.txt',
  ext: 'txt',
  category: 'other',
  size: 4,
  uploadedBy: USER_A,
  uploadedAt: now,
  sha256: 'abcd',
  storagePath: '/tmp/spec.txt',
  previewStatus: 'none',
  isBookmark: false,
  updatedAt: now
}
insertFile(dbA, meta)

stubA.subscribe(GROUP, (env) => {
  void respondToRequest(dbA, stubA, USER_A, DEVICE_A, env)
})
stubB.subscribe(GROUP, (env) => {
  if (env.type !== 'file_meta_sync_batch' || !env.groupId) return
  if (!isFileMetaSyncBatchPayload(env.payload)) return
  for (const row of env.payload.files) {
    upsertRemoteFileMeta(dbB, {
      ...row,
      groupId: env.groupId,
      storagePath: `${REMOTE_PENDING_PREFIX}${row.fileId}`,
      previewStatus: 'none',
      previewPath: undefined
    })
  }
})

try {
  assert.equal(listFilesByGroup(dbB, GROUP).length, 0, 'B should start with empty library')

  await stubB.publish({
    version: 1,
    type: 'file_meta_sync_request',
    msgId: `fm_req_${randomUUID()}`,
    senderUserId: USER_B,
    senderDeviceId: DEVICE_B,
    groupId: GROUP,
    ts: now,
    payload: { sinceUpdatedAt: '', minUpdatedAt: '2020-01-01T00:00:00.000Z' },
    nonce: '',
    authTag: ''
  })

  await new Promise((r) => setTimeout(r, 500))

  const after = getFileById(dbB, meta.fileId)
  assert.ok(after, 'B should have file index after catch-up')
  assert.equal(after?.name, 'spec.txt')
  assert.ok(
    after?.storagePath.startsWith(REMOTE_PENDING_PREFIX),
    `expected remote-pending, got ${after?.storagePath}`
  )
  console.log('OK: file_meta offline sync restored library index')
} finally {
  stubA.stop()
  stubB.stop()
  dbA.close()
  dbB.close()
  for (const d of _tempDirs) rmLanpmTemp(d)
}

console.log('verify:file-meta-offline OK')
