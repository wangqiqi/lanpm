import { createHash, randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { BrowserWindow, app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type {
  FileChunkPayload,
  FileMetaBroadcastPayload,
  FilePullRequestPayload
} from '../../shared/file/sync'
import { throwLanpm } from '../../shared/errors/lanpmError'
import { REMOTE_PENDING_PREFIX } from '../../shared/file/sync'
import type { SyncEnvelope } from '../../shared/network/types'
import { FILE_CHUNK_SIZE, FILE_TRANSFER_PUSH_CHANNEL } from '../../shared/file/channels'
import type { FileMeta } from '../../shared/file/types'
import { listUserGroups } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import {
  getFileById,
  upsertRemoteFileMeta
} from '../storage/repositories/fileRepository'
import { generatePreview } from './previewService'
import { catchSyncFailure } from '../utils/reportSyncFailure'

const subscribedGroups = new Map<string, () => void>()
const pullBuffers = new Map<
  string,
  {
    chunks: Map<number, Buffer>
    totalBytes: number
    sha256: string
    resolve: (p: string) => void
    reject: (e: Error) => void
  }
>()

function filesRootDir(): string {
  const dir = join(app.getPath('userData'), 'files')
  mkdirSync(dir, { recursive: true })
  return dir
}

function broadcastFiles(groupId: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(FILE_TRANSFER_PUSH_CHANNEL, groupId)
  }
}

async function publishEnvelope(
  db: Database,
  groupId: string,
  type: SyncEnvelope['type'],
  payload: unknown
): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const envelope: SyncEnvelope = {
    version: 1,
    type,
    msgId: `${type}_${randomUUID()}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId,
    ts: new Date().toISOString(),
    payload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

function handleFileMeta(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'file_meta' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return

  const payload = envelope.payload as FileMetaBroadcastPayload
  const remote = payload?.meta
  if (!remote?.fileId) return

  const meta: FileMeta = {
    ...remote,
    groupId: envelope.groupId,
    storagePath: `${REMOTE_PENDING_PREFIX}${remote.fileId}`,
    previewStatus: 'none',
    updatedAt: remote.updatedAt ?? remote.uploadedAt
  }
  if (upsertRemoteFileMeta(db, meta)) {
    broadcastFiles(envelope.groupId)
  }
}

async function handleFilePullRequest(db: Database, envelope: SyncEnvelope): Promise<void> {
  if (envelope.type !== 'file_pull_request' || !envelope.groupId) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return

  const payload = envelope.payload as FilePullRequestPayload
  const meta = getFileById(db, payload.fileId)
  if (!meta || meta.isBookmark || !existsSync(meta.storagePath)) return
  if (meta.storagePath.startsWith(REMOTE_PENDING_PREFIX)) return

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
    await publishEnvelope(db, meta.groupId, 'file_chunk', chunkPayload)
    offset = end
  }
}

function handleFileChunk(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'file_chunk' || !envelope.groupId) return
  const chunk = envelope.payload as FileChunkPayload
  if (!chunk?.fileId) return

  const session = pullBuffers.get(chunk.fileId)
  if (!session) return

  session.chunks.set(chunk.offset, Buffer.from(chunk.chunkBase64, 'base64'))
  if (!chunk.done) return

  const ordered = [...session.chunks.entries()].sort((a, b) => a[0] - b[0])
  const body = Buffer.concat(ordered.map(([, b]) => b))
  const hash = createHash('sha256').update(body).digest('hex')
  if (hash !== session.sha256) {
    pullBuffers.delete(chunk.fileId)
    session.reject(new Error('SHA256 校验失败'))
    return
  }

  const meta = getFileById(db, chunk.fileId)
  if (!meta) {
    pullBuffers.delete(chunk.fileId)
    session.reject(new Error('文件元数据不存在'))
    return
  }

  const groupDir = join(filesRootDir(), meta.groupId)
  mkdirSync(groupDir, { recursive: true })
  const destPath = join(groupDir, `${meta.fileId}_${meta.name}`)
  writeFileSync(destPath, body)

  db.prepare(
    `UPDATE files SET storage_path = ?, preview_status = 'none', updated_at = ? WHERE file_id = ?`
  ).run(destPath, new Date().toISOString(), meta.fileId)

  pullBuffers.delete(chunk.fileId)
  void generatePreview(db, { ...meta, storagePath: destPath }).catch(
    catchSyncFailure('fileSync.generatePreview', { notify: false })
  )
  broadcastFiles(meta.groupId)
  session.resolve(destPath)
}

function handleIncoming(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type === 'file_meta') {
    handleFileMeta(db, envelope)
    return
  }
  if (envelope.type === 'file_pull_request') {
    void handleFilePullRequest(db, envelope).catch(
      catchSyncFailure('fileSync.handlePullRequest', { notify: false })
    )
    return
  }
  if (envelope.type === 'file_chunk') {
    handleFileChunk(db, envelope)
  }
}

function ensureSubscribed(db: Database, groupId: string): void {
  if (subscribedGroups.has(groupId)) return
  const transport = getNetworkTransport()
  if (!transport) return
  const unsub = transport.subscribe(groupId, (env) => handleIncoming(db, env))
  subscribedGroups.set(groupId, unsub)
}

export function initFileSyncService(db: Database): void {
  const transport = getNetworkTransport()
  if (!transport) return
  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()
  for (const group of listUserGroups(db)) {
    ensureSubscribed(db, group.groupId)
  }
}

export function shutdownFileSyncService(): void {
  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()
  pullBuffers.clear()
}

function armPullReceiver(
  fileId: string,
  meta: { size: number; sha256: string },
  timeoutMs = 60_000
): Promise<string> {
  return new Promise((resolve, reject) => {
    pullBuffers.set(fileId, {
      chunks: new Map(),
      totalBytes: meta.size,
      sha256: meta.sha256,
      resolve,
      reject
    })
    setTimeout(() => {
      if (pullBuffers.has(fileId)) {
        pullBuffers.delete(fileId)
        reject(new Error('拉取远端文件超时'))
      }
    }, timeoutMs)
  })
}

export { armPullReceiver as armPullReceiverForTest }

export function publishFileMeta(db: Database, meta: FileMeta): void {
  if (meta.isBookmark) return
  const payload: FileMetaBroadcastPayload = { meta }
  void publishEnvelope(db, meta.groupId, 'file_meta', payload).catch(
    catchSyncFailure('fileSync.publishMeta', {
      messageKey: 'sync.filePublishFailed'
    })
  )
}

export async function pullRemoteFile(db: Database, fileId: string): Promise<FileMeta> {
  const meta = getFileById(db, fileId)
  if (!meta) throwLanpm('err.fileNotFound')
  if (!meta.storagePath.startsWith(REMOTE_PENDING_PREFIX)) {
    return meta
  }

  ensureSubscribed(db, meta.groupId)

  const destPromise = armPullReceiver(fileId, meta)

  const payload: FilePullRequestPayload = { fileId, groupId: meta.groupId }
  await publishEnvelope(db, meta.groupId, 'file_pull_request', payload)

  await destPromise
  return getFileById(db, fileId)!
}

export { handleIncoming as handleFileSyncForTest }
