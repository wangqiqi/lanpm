import { createHash, randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { BrowserWindow, app } from 'electron'
import {
  closeSync,
  createReadStream,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  truncateSync,
  unlinkSync,
  writeSync
} from 'fs'
import { join } from 'path'
import type {
  FileChunkPayload,
  FileMetaBroadcastPayload,
  FilePullRequestPayload
} from '../../shared/file/sync'
import {
  filePullFromOffset,
  isFilePullRequestPayload,
  partialFileName,
  REMOTE_PENDING_PREFIX
} from '../../shared/file/sync'
import { throwLanpm } from '../../shared/errors/lanpmError'
import type { SyncEnvelope } from '../../shared/network/types'
import { FILE_CHUNK_SIZE, FILE_TRANSFER_PUSH_CHANNEL } from '../../shared/file/channels'
import type { FileMeta } from '../../shared/file/types'
import { listUserGroups } from '../group/groupService'
import { getSetupStatus } from '../identity/setup'
import { getNetworkTransport } from '../network'
import { getFileById, upsertRemoteFileMeta } from '../storage/repositories/fileRepository'
import {
  finishTransfer,
  getLatestDownloadTransfer,
  getTransferById,
  insertTransfer,
  updateTransferProgress
} from '../storage/repositories/fileTransferRepository'
import { generatePreview } from './previewService'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import { enqueueFailedPublish } from '../sync/outboxEnqueue'

const subscribedGroups = new Map<string, () => void>()

interface PullSession {
  transferId: string
  partialPath: string
  totalBytes: number
  sha256: string
  groupId: string
  resolve: (p: string) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const pullSessions = new Map<string, PullSession>()

function filesRootDir(): string {
  const dir = join(app.getPath('userData'), 'files')
  mkdirSync(dir, { recursive: true })
  return dir
}

function groupFilesDir(groupId: string): string {
  const dir = join(filesRootDir(), groupId)
  mkdirSync(dir, { recursive: true })
  return dir
}

export function partialPathFor(groupId: string, fileId: string): string {
  return join(groupFilesDir(groupId), partialFileName(fileId))
}

function broadcastFiles(groupId: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(FILE_TRANSFER_PUSH_CHANNEL, groupId)
  }
}

const FILE_CHUNK_PROGRESS_BROADCAST_MS = 100
const lastChunkProgressBroadcastAt = new Map<string, number>()

function broadcastFilesProgress(groupId: string, fileId: string, force: boolean): void {
  const now = Date.now()
  const last = lastChunkProgressBroadcastAt.get(fileId) ?? 0
  if (!force && now - last < FILE_CHUNK_PROGRESS_BROADCAST_MS) return
  lastChunkProgressBroadcastAt.set(fileId, now)
  broadcastFiles(groupId)
}

function clearChunkProgressBroadcast(fileId: string): void {
  lastChunkProgressBroadcastAt.delete(fileId)
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
  if (!isFilePullRequestPayload(envelope.payload)) return

  const payload = envelope.payload
  const meta = getFileById(db, payload.fileId)
  if (!meta || meta.isBookmark || !existsSync(meta.storagePath)) return
  if (meta.storagePath.startsWith(REMOTE_PENDING_PREFIX)) return

  const buf = readFileSync(meta.storagePath)
  let fromOffset = filePullFromOffset(payload)
  if (fromOffset > buf.length) fromOffset = 0
  let offset = fromOffset
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

function ensurePartialFile(partialPath: string, fromOffset: number): void {
  if (existsSync(partialPath)) {
    const size = statSync(partialPath).size
    if (size === fromOffset) return
    if (size > fromOffset) {
      truncateSync(partialPath, fromOffset)
      return
    }
    unlinkSync(partialPath)
  }
  const fd = openSync(partialPath, 'w')
  closeSync(fd)
  if (fromOffset > 0) truncateSync(partialPath, fromOffset)
}

function sha256FileSync(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(path)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

function failPullSession(db: Database, fileId: string, err: Error): void {
  const session = pullSessions.get(fileId)
  if (!session) return
  clearTimeout(session.timer)
  pullSessions.delete(fileId)
  finishTransfer(db, session.transferId, 'failed', err.message)
  clearChunkProgressBroadcast(fileId)
  broadcastFiles(session.groupId)
  session.reject(err)
}

/** 用户取消：停收 chunk、保留 .partial，供后续 resume */
export function cancelPullByTransferId(db: Database, transferId: string): boolean {
  for (const [fileId, session] of pullSessions) {
    if (session.transferId !== transferId) continue
    clearTimeout(session.timer)
    pullSessions.delete(fileId)
    finishTransfer(db, session.transferId, 'cancelled')
    clearChunkProgressBroadcast(fileId)
    broadcastFiles(session.groupId)
    session.reject(new Error('err.transferCancelled'))
    return true
  }
  return false
}

function handleFileChunk(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'file_chunk' || !envelope.groupId) return
  const chunk = envelope.payload as FileChunkPayload
  if (!chunk?.fileId) return

  const session = pullSessions.get(chunk.fileId)
  if (!session) return

  try {
    const data = Buffer.from(chunk.chunkBase64, 'base64')
    const fd = openSync(session.partialPath, 'r+')
    writeSync(fd, data, 0, data.length, chunk.offset)
    closeSync(fd)

    const transferred = Math.max(chunk.offset + data.length, statSync(session.partialPath).size)
    updateTransferProgress(db, session.transferId, transferred, 'transferring')
    broadcastFilesProgress(session.groupId, chunk.fileId, Boolean(chunk.done))

    if (!chunk.done) return

    void finalizePull(db, chunk.fileId, session).catch((e) => {
      failPullSession(db, chunk.fileId, e instanceof Error ? e : new Error(String(e)))
    })
  } catch (e) {
    failPullSession(db, chunk.fileId, e instanceof Error ? e : new Error(String(e)))
  }
}

async function finalizePull(db: Database, fileId: string, session: PullSession): Promise<void> {
  const hash = await sha256FileSync(session.partialPath)
  if (hash !== session.sha256) {
    failPullSession(db, fileId, new Error('SHA256 校验失败'))
    return
  }

  const meta = getFileById(db, fileId)
  if (!meta) {
    failPullSession(db, fileId, new Error('文件元数据不存在'))
    return
  }

  const destPath = join(groupFilesDir(meta.groupId), `${meta.fileId}_${meta.name}`)
  if (existsSync(destPath)) unlinkSync(destPath)
  renameSync(session.partialPath, destPath)

  db.prepare(
    `UPDATE files SET storage_path = ?, preview_status = 'none', updated_at = ? WHERE file_id = ?`
  ).run(destPath, new Date().toISOString(), meta.fileId)

  clearTimeout(session.timer)
  pullSessions.delete(fileId)
  finishTransfer(db, session.transferId, 'completed')
  void generatePreview(db, { ...meta, storagePath: destPath }).catch(
    catchSyncFailure('fileSync.generatePreview', { notify: false })
  )
  clearChunkProgressBroadcast(fileId)
  broadcastFiles(session.groupId)
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
  for (const [fileId, session] of pullSessions) {
    clearTimeout(session.timer)
    session.reject(new Error('file sync shutdown'))
    pullSessions.delete(fileId)
  }
}

export function bytesOnPartial(groupId: string, fileId: string): number {
  const path = partialPathFor(groupId, fileId)
  if (!existsSync(path)) return 0
  return statSync(path).size
}

/**
 * Arm receiver: write chunks to `{fileId}.partial`, track SQLite download transfer.
 */
function armPullReceiver(
  db: Database,
  meta: FileMeta,
  opts?: { fromOffset?: number; transferId?: string; fromDeviceId?: string },
  timeoutMs = 120_000
): Promise<string> {
  const fromOffset = opts?.fromOffset ?? 0
  const partialPath = partialPathFor(meta.groupId, meta.fileId)
  ensurePartialFile(partialPath, fromOffset)

  const status = getSetupStatus(db)
  const deviceId = status.device?.deviceId ?? ''
  const transferId = opts?.transferId ?? `xfer_dl_${randomUUID()}`

  if (!opts?.transferId) {
    insertTransfer(db, {
      transferId,
      fileId: meta.fileId,
      groupId: meta.groupId,
      direction: 'download',
      fromDeviceId: opts?.fromDeviceId ?? '',
      toDeviceId: deviceId,
      status: 'transferring',
      totalBytes: meta.size,
      transferredBytes: fromOffset,
      chunkSize: FILE_CHUNK_SIZE,
      checksum: meta.sha256,
      startedAt: new Date().toISOString()
    })
  } else {
    db.prepare(
      `UPDATE file_transfers SET transferred_bytes = ?, status = ?, finished_at = NULL, error_message = NULL WHERE transfer_id = ?`
    ).run(fromOffset, 'transferring', transferId)
  }
  broadcastFiles(meta.groupId)

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!pullSessions.has(meta.fileId)) return
      failPullSession(db, meta.fileId, new Error('拉取远端文件超时'))
    }, timeoutMs)

    pullSessions.set(meta.fileId, {
      transferId,
      partialPath,
      totalBytes: meta.size,
      sha256: meta.sha256,
      groupId: meta.groupId,
      resolve,
      reject,
      timer
    })
  })
}

export { armPullReceiver as armPullReceiverForTest }

export function publishFileMeta(db: Database, meta: FileMeta): void {
  if (meta.isBookmark) return
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) return

  const payload: FileMetaBroadcastPayload = { meta }
  const envelope: SyncEnvelope = {
    version: 1,
    type: 'file_meta',
    msgId: `file_meta_${randomUUID()}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId: meta.groupId,
    ts: new Date().toISOString(),
    payload,
    nonce: '',
    authTag: ''
  }
  const dedupeKey = `file:${meta.fileId}`
  const transport = getNetworkTransport()
  if (!transport) {
    enqueueFailedPublish(db, {
      channel: 'file_meta',
      groupId: meta.groupId,
      dedupeKey,
      envelope
    })
    return
  }
  void (async () => {
    ensureSubscribed(db, meta.groupId)
    try {
      await transport.publish(envelope)
    } catch (err) {
      enqueueFailedPublish(db, {
        channel: 'file_meta',
        groupId: meta.groupId,
        dedupeKey,
        envelope
      })
      throw err
    }
  })().catch(
    catchSyncFailure('fileSync.publishMeta', {
      messageKey: 'sync.filePublishFailed'
    })
  )
}

export type PullRemoteOptions = {
  /** Resume a specific download transfer row (IPC resumeTransfer). */
  resumeTransferId?: string
}

export async function pullRemoteFile(
  db: Database,
  fileId: string,
  opts?: PullRemoteOptions
): Promise<FileMeta> {
  const meta = getFileById(db, fileId)
  if (!meta) throwLanpm('err.fileNotFound')
  if (!meta.storagePath.startsWith(REMOTE_PENDING_PREFIX)) {
    return meta
  }

  ensureSubscribed(db, meta.groupId)

  const onDisk = bytesOnPartial(meta.groupId, fileId)
  let fromOffset = onDisk
  let transferId: string | undefined
  let fromDeviceId: string | undefined

  if (opts?.resumeTransferId) {
    const targeted = getTransferById(db, opts.resumeTransferId)
    if (
      !targeted ||
      targeted.fileId !== fileId ||
      targeted.direction !== 'download'
    ) {
      throwLanpm('err.transferResumeInvalid')
    }
    fromOffset = Math.min(onDisk, targeted.transferredBytes)
    transferId = targeted.transferId
    fromDeviceId = targeted.fromDeviceId
  } else {
    const existing = getLatestDownloadTransfer(db, fileId)
    if (
      existing &&
      (existing.status === 'failed' ||
        existing.status === 'paused' ||
        existing.status === 'cancelled' ||
        existing.status === 'transferring') &&
      existing.transferredBytes > 0 &&
      existing.transferredBytes < existing.totalBytes
    ) {
      fromOffset = Math.min(onDisk, existing.transferredBytes)
      if (fromOffset === existing.transferredBytes) {
        transferId = existing.transferId
        fromDeviceId = existing.fromDeviceId
      }
    }
  }

  const destPromise = armPullReceiver(db, meta, { fromOffset, transferId, fromDeviceId })

  const payload: FilePullRequestPayload = {
    fileId,
    groupId: meta.groupId,
    fromOffset: fromOffset > 0 ? fromOffset : undefined
  }
  await publishEnvelope(db, meta.groupId, 'file_pull_request', payload)

  await destPromise
  return getFileById(db, fileId)!
}

export { handleIncoming as handleFileSyncForTest }
