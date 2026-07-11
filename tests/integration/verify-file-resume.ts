/**
 * TASK-169 — P2P file_pull 断点续传：中断后 fromOffset 续传拼出完整文件。
 * Run: npm run verify:file-resume
 */
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'crypto'
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
  writeSync
} from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import type { FileChunkPayload, FileMetaBroadcastPayload } from '../../src/shared/file/sync.ts'
import {
  REMOTE_PENDING_PREFIX,
  filePullFromOffset,
  isFilePullRequestPayload,
  partialFileName
} from '../../src/shared/file/sync.ts'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import { NetworkStub } from '../../src/main/network/stub/NetworkStub.ts'
import { insertGroup } from '../../src/main/storage/repositories/groupRepository.ts'
import { setMeta } from '../../src/main/storage/repositories/syncMetaRepository.ts'
import { upsertDevice } from '../../src/main/storage/repositories/deviceRepository.ts'
import { upsertUser } from '../../src/main/storage/repositories/userRepository.ts'
import {
  getFileById,
  insertFile,
  upsertRemoteFileMeta
} from '../../src/main/storage/repositories/fileRepository.ts'
import {
  finishTransfer,
  getLatestDownloadTransfer,
  insertTransfer,
  updateTransferProgress
} from '../../src/main/storage/repositories/fileTransferRepository.ts'
import type { FileMeta } from '../../src/shared/file/types.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const syncServiceSrc = readFileSync(join(projectRoot, 'src/main/file/fileSyncService.ts'), 'utf8')

assert.match(syncServiceSrc, /fromOffset/, 'sender/receiver must use fromOffset')
assert.match(syncServiceSrc, /\.partial|partialFileName/, 'receiver must persist .partial')
assert.match(syncServiceSrc, /getLatestDownloadTransfer|resumeTransferId/, 'resume must read SQLite progress')
assert.doesNotMatch(syncServiceSrc, /pullBuffers/, 'in-memory pullBuffers must be gone')

const TEST_CHUNK = 8
const GROUP = 'demo-project'
const _tempDirs: string[] = []

function seedDb(db: Database.Database, userId: string, deviceId: string): void {
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
    name: 'Demo',
    createdBy: userId,
    createdAt: now,
    autoDiscover: true
  })
}

function openDb(label: string, userId: string, deviceId: string): { db: Database.Database; dir: string } {
  const dir = mkLanpmTemp(`lanpm-file-resume-${label}-`)
  _tempDirs.push(dir)
  const db = new Database(join(dir, 'test.db'))
  db.exec(schemaSql)
  seedDb(db, userId, deviceId)
  return { db, dir }
}

function handleFileMeta(db: Database.Database, localDeviceId: string, envelope: SyncEnvelope): void {
  if (envelope.type !== 'file_meta' || !envelope.groupId) return
  if (envelope.senderDeviceId === localDeviceId) return
  const remote = (envelope.payload as FileMetaBroadcastPayload)?.meta
  if (!remote?.fileId) return
  upsertRemoteFileMeta(db, {
    ...remote,
    groupId: envelope.groupId,
    storagePath: `${REMOTE_PENDING_PREFIX}${remote.fileId}`,
    previewStatus: 'none',
    updatedAt: remote.updatedAt ?? remote.uploadedAt
  })
}

/** Sender honors fromOffset (mirrors fileSyncService handleFilePullRequest). */
async function respondPullFromOffset(
  stub: NetworkStub,
  db: Database.Database,
  localDeviceId: string,
  envelope: SyncEnvelope
): Promise<number> {
  if (envelope.type !== 'file_pull_request' || !envelope.groupId) return 0
  if (envelope.senderDeviceId === localDeviceId) return 0
  if (!isFilePullRequestPayload(envelope.payload)) return 0
  const payload = envelope.payload
  const meta = getFileById(db, payload.fileId)
  if (!meta || meta.storagePath.startsWith(REMOTE_PENDING_PREFIX)) return 0
  const buf = readFileSync(meta.storagePath)
  let fromOffset = filePullFromOffset(payload)
  if (fromOffset > buf.length) fromOffset = 0
  let offset = fromOffset
  let chunksSent = 0
  while (offset < buf.length) {
    const end = Math.min(buf.length, offset + TEST_CHUNK)
    const slice = buf.subarray(offset, end)
    const chunkPayload: FileChunkPayload = {
      fileId: meta.fileId,
      groupId: meta.groupId,
      offset,
      chunkBase64: slice.toString('base64'),
      totalBytes: meta.size,
      sha256: meta.sha256,
      done: end >= buf.length
    }
    await stub.publish({
      version: 1,
      type: 'file_chunk',
      msgId: `fc_${meta.fileId}_${offset}_${randomUUID()}`,
      senderUserId: 'user_resume_a',
      senderDeviceId: 'dev_resume_a',
      groupId: meta.groupId,
      ts: new Date().toISOString(),
      payload: chunkPayload,
      nonce: '',
      authTag: ''
    })
    chunksSent += 1
    offset = end
  }
  return chunksSent
}

function applyChunkToPartial(
  partialPath: string,
  transferId: string,
  db: Database.Database,
  chunk: FileChunkPayload
): void {
  const data = Buffer.from(chunk.chunkBase64, 'base64')
  const fd = openSync(partialPath, existsSync(partialPath) ? 'r+' : 'w')
  writeSync(fd, data, 0, data.length, chunk.offset)
  closeSync(fd)
  updateTransferProgress(db, transferId, chunk.offset + data.length, 'transferring')
}

const { db: dbA, dir: dirA } = openDb('a', 'user_resume_a', 'dev_resume_a')
const { db: dbB, dir: dirB } = openDb('b', 'user_resume_b', 'dev_resume_b')

// 3+ chunks so resume mid-file is meaningful
const content = Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ012345') // 36 bytes → 5 chunks of 8
const sha256 = createHash('sha256').update(content).digest('hex')
const filePath = join(dirA, 'resume-sample.bin')
writeFileSync(filePath, content)

const now = new Date().toISOString()
const fileId = `file_${randomUUID()}`
const meta: FileMeta = {
  fileId,
  groupId: GROUP,
  name: 'resume-sample.bin',
  ext: 'bin',
  category: 'other',
  size: content.length,
  uploadedBy: 'user_resume_a',
  uploadedAt: now,
  sha256,
  storagePath: filePath,
  previewStatus: 'none',
  isBookmark: false,
  updatedAt: now
}
insertFile(dbA, meta)

const stubA = new NetworkStub({
  deviceId: 'dev_resume_a',
  userId: 'user_resume_a',
  displayName: 'Resume A'
})
const stubB = new NetworkStub({
  deviceId: 'dev_resume_b',
  userId: 'user_resume_b',
  displayName: 'Resume B'
})

const partialPath = join(dirB, partialFileName(fileId))
const transferId = `xfer_dl_${randomUUID()}`
let phase1Chunks = 0
let phase2Chunks = 0
let interruptAfter = TEST_CHUNK * 2 // keep first 16 bytes, then resume
let phase: 'interrupt' | 'resume' = 'interrupt'
let completedPath: string | null = null

stubA.start()
stubB.start()
stubB.subscribe(GROUP, (env) => handleFileMeta(dbB, 'dev_resume_b', env))
stubA.subscribe(GROUP, (env) => {
  void respondPullFromOffset(stubA, dbA, 'dev_resume_a', env)
    .then((n) => {
      if (phase === 'interrupt') phase1Chunks = n
      else phase2Chunks = n
    })
    .catch((e) => {
      throw e
    })
})
stubB.subscribe(GROUP, (env) => {
  if (env.type !== 'file_chunk') return
  const chunk = env.payload as FileChunkPayload
  if (phase === 'interrupt' && chunk.offset >= interruptAfter) {
    // drop remaining chunks — simulate disconnect
    return
  }
  applyChunkToPartial(partialPath, transferId, dbB, chunk)
  if (phase === 'interrupt' && chunk.offset + Buffer.from(chunk.chunkBase64, 'base64').length >= interruptAfter) {
    finishTransfer(dbB, transferId, 'failed', 'simulated disconnect')
    return
  }
  if (chunk.done) {
    const hash = createHash('sha256').update(readFileSync(partialPath)).digest('hex')
    if (hash !== chunk.sha256) throw new Error('SHA256 mismatch after resume')
    const dest = join(dirB, `${fileId}_${meta.name}`)
    renameSync(partialPath, dest)
    dbB
      .prepare(`UPDATE files SET storage_path = ?, updated_at = ? WHERE file_id = ?`)
      .run(dest, new Date().toISOString(), fileId)
    finishTransfer(dbB, transferId, 'completed')
    completedPath = dest
  }
})

try {
  await stubA.publish({
    version: 1,
    type: 'file_meta',
    msgId: `fm_${fileId}`,
    senderUserId: 'user_resume_a',
    senderDeviceId: 'dev_resume_a',
    groupId: GROUP,
    ts: now,
    payload: { meta } satisfies FileMetaBroadcastPayload,
    nonce: '',
    authTag: ''
  })
  await new Promise((r) => setTimeout(r, 400))

  const pending = getFileById(dbB, fileId)
  assert.ok(pending?.storagePath.startsWith(REMOTE_PENDING_PREFIX), 'remote-pending on B')

  insertTransfer(dbB, {
    transferId,
    fileId,
    groupId: GROUP,
    direction: 'download',
    fromDeviceId: 'dev_resume_a',
    toDeviceId: 'dev_resume_b',
    status: 'transferring',
    totalBytes: content.length,
    transferredBytes: 0,
    chunkSize: TEST_CHUNK,
    checksum: sha256,
    startedAt: now
  })

  // Phase 1: full request, interrupt mid-file
  phase = 'interrupt'
  await stubB.publish({
    version: 1,
    type: 'file_pull_request',
    msgId: `fpr1_${fileId}`,
    senderUserId: 'user_resume_b',
    senderDeviceId: 'dev_resume_b',
    groupId: GROUP,
    ts: new Date().toISOString(),
    payload: { fileId, groupId: GROUP },
    nonce: '',
    authTag: ''
  })
  await new Promise((r) => setTimeout(r, 600))

  assert.ok(existsSync(partialPath), 'partial file must exist after interrupt')
  const partialSize = statSync(partialPath).size
  assert.equal(partialSize, interruptAfter, `partial size expected ${interruptAfter}, got ${partialSize}`)
  const latest = getLatestDownloadTransfer(dbB, fileId)
  assert.ok(latest, 'download transfer row')
  assert.equal(latest.status, 'failed')
  assert.equal(latest.transferredBytes, interruptAfter)
  assert.ok(phase1Chunks >= 3, `phase1 should send full file chunks, got ${phase1Chunks}`)

  // Phase 2: resume fromOffset
  phase = 'resume'
  dbB
    .prepare(
      `UPDATE file_transfers SET status = ?, finished_at = NULL, error_message = NULL WHERE transfer_id = ?`
    )
    .run('transferring', transferId)
  updateTransferProgress(dbB, transferId, interruptAfter, 'transferring')

  await stubB.publish({
    version: 1,
    type: 'file_pull_request',
    msgId: `fpr2_${fileId}`,
    senderUserId: 'user_resume_b',
    senderDeviceId: 'dev_resume_b',
    groupId: GROUP,
    ts: new Date().toISOString(),
    payload: { fileId, groupId: GROUP, fromOffset: interruptAfter },
    nonce: '',
    authTag: ''
  })
  await new Promise((r) => setTimeout(r, 800))

  assert.ok(completedPath, 'resume must complete file')
  assert.ok(readFileSync(completedPath!).equals(content), 'resumed content must match')
  const expectedResumeChunks = Math.ceil((content.length - interruptAfter) / TEST_CHUNK)
  assert.equal(
    phase2Chunks,
    expectedResumeChunks,
    `phase2 should send only remaining chunks (${expectedResumeChunks}), got ${phase2Chunks}`
  )
  const done = getFileById(dbB, fileId)
  assert.ok(done && !done.storagePath.startsWith(REMOTE_PENDING_PREFIX), 'storage_path finalized')
} finally {
  stubA.stop()
  stubB.stop()
  dbA.close()
  dbB.close()
  for (const d of _tempDirs) rmLanpmTemp(d)
}

console.log('verify:file-resume OK')
