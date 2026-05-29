/**
 * B-02 — file_meta + file_pull_request/file_chunk 远端拉取冒烟。
 * Run: npm run verify:file-sync
 */
import { createHash, randomUUID } from 'crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import type { FileChunkPayload, FileMetaBroadcastPayload } from '../../src/shared/file/sync.ts'
import { REMOTE_PENDING_PREFIX } from '../../src/shared/file/sync.ts'
import { FILE_CHUNK_SIZE } from '../../src/shared/file/channels.ts'
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
import type { FileMeta } from '../../src/shared/file/types.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const GROUP = 'demo-project'

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

async function respondPullRequest(
  stub: NetworkStub,
  db: Database.Database,
  localDeviceId: string,
  envelope: SyncEnvelope
): Promise<void> {
  if (envelope.type !== 'file_pull_request' || !envelope.groupId) return
  if (envelope.senderDeviceId === localDeviceId) return
  const payload = envelope.payload as { fileId: string }
  const meta = getFileById(db, payload.fileId)
  if (!meta || meta.storagePath.startsWith(REMOTE_PENDING_PREFIX)) return
  const buf = readFileSync(meta.storagePath)
  let offset = 0
  while (offset < buf.length) {
    const end = Math.min(buf.length, offset + FILE_CHUNK_SIZE)
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
      msgId: `fc_${meta.fileId}_${offset}`,
      senderUserId: 'user_file_a',
      senderDeviceId: 'dev_file_a',
      groupId: meta.groupId,
      ts: new Date().toISOString(),
      payload: chunkPayload,
      nonce: '',
      authTag: ''
    })
    offset = end
  }
}

function assembleChunks(
  db: Database.Database,
  destDir: string,
  chunks: Map<number, Buffer>,
  chunk: FileChunkPayload
): string | null {
  chunks.set(chunk.offset, Buffer.from(chunk.chunkBase64, 'base64'))
  if (!chunk.done) return null
  const ordered = [...chunks.entries()].sort((a, b) => a[0] - b[0])
  const body = Buffer.concat(ordered.map(([, b]) => b))
  const hash = createHash('sha256').update(body).digest('hex')
  if (hash !== chunk.sha256) throw new Error('SHA256 mismatch')
  const meta = getFileById(db, chunk.fileId)
  if (!meta) throw new Error('missing meta')
  const destPath = join(destDir, `${meta.fileId}_${meta.name}`)
  writeFileSync(destPath, body)
  db.prepare(
    `UPDATE files SET storage_path = ?, preview_status = 'none', updated_at = ? WHERE file_id = ?`
  ).run(destPath, new Date().toISOString(), meta.fileId)
  return destPath
}

function openDb(label: string, userId: string, deviceId: string): { db: Database.Database; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), `lanpm-file-sync-${label}-`))
  const db = new Database(join(dir, 'test.db'))
  db.exec(schemaSql)
  seedDb(db, userId, deviceId)
  return { db, dir }
}

const { db: dbA, dir: dirA } = openDb('a', 'user_file_a', 'dev_file_a')
const { db: dbB, dir: dirB } = openDb('b', 'user_file_b', 'dev_file_b')

const content = Buffer.from('lanpm file sync payload')
const sha256 = createHash('sha256').update(content).digest('hex')
const filePath = join(dirA, 'sample.txt')
writeFileSync(filePath, content)

const now = new Date().toISOString()
const fileId = `file_${randomUUID()}`
const meta: FileMeta = {
  fileId,
  groupId: GROUP,
  name: 'sample.txt',
  ext: 'txt',
  category: 'code',
  size: content.length,
  uploadedBy: 'user_file_a',
  uploadedAt: now,
  sha256,
  storagePath: filePath,
  previewStatus: 'none',
  isBookmark: false,
  updatedAt: now
}
insertFile(dbA, meta)

const stubA = new NetworkStub({
  deviceId: 'dev_file_a',
  userId: 'user_file_a',
  displayName: 'File A'
})
const stubB = new NetworkStub({
  deviceId: 'dev_file_b',
  userId: 'user_file_b',
  displayName: 'File B'
})

const pullChunks = new Map<number, Buffer>()

stubA.start()
stubB.start()
stubB.subscribe(GROUP, (env) => handleFileMeta(dbB, 'dev_file_b', env))
stubA.subscribe(GROUP, (env) => {
  void respondPullRequest(stubA, dbA, 'dev_file_a', env).catch((e) => {
    throw e
  })
})
stubB.subscribe(GROUP, (env) => {
  if (env.type !== 'file_chunk') return
  const chunk = env.payload as FileChunkPayload
  const dest = assembleChunks(dbB, dirB, pullChunks, chunk)
  if (dest && !readFileSync(dest).equals(content)) throw new Error('assembled content mismatch')
})

try {
  await stubA.publish({
    version: 1,
    type: 'file_meta',
    msgId: `fm_${fileId}`,
    senderUserId: 'user_file_a',
    senderDeviceId: 'dev_file_a',
    groupId: GROUP,
    ts: now,
    payload: { meta } satisfies FileMetaBroadcastPayload,
    nonce: '',
    authTag: ''
  })
  await new Promise((r) => setTimeout(r, 500))

  const pending = getFileById(dbB, fileId)
  if (!pending?.storagePath.startsWith(REMOTE_PENDING_PREFIX)) {
    throw new Error('file_meta did not register remote-pending on B')
  }

  await stubB.publish({
    version: 1,
    type: 'file_pull_request',
    msgId: `fpr_${fileId}`,
    senderUserId: 'user_file_b',
    senderDeviceId: 'dev_file_b',
    groupId: GROUP,
    ts: new Date().toISOString(),
    payload: { fileId, groupId: GROUP },
    nonce: '',
    authTag: ''
  })
  await new Promise((r) => setTimeout(r, 800))

  const local = getFileById(dbB, fileId)
  if (!local || local.storagePath.startsWith(REMOTE_PENDING_PREFIX)) {
    throw new Error('file pull did not update storage_path on B')
  }
} finally {
  stubA.stop()
  stubB.stop()
  dbA.close()
  dbB.close()
}

console.log('verify:file-sync OK')
