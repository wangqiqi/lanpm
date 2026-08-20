import { createHash, randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { basename, extname } from 'path'
import { type BrowserWindow } from 'electron'
import type { FileCategory, FileMeta, FileTransferView } from '../../shared/file/types'
import { inferCategory } from '../../shared/file/types'
import {
  isTextPreviewFile,
  supportsInlinePreview,
  TEXT_PREVIEW_MAX_BYTES
} from '../../shared/file/previewExtensions.ts'
import { FILE_CHUNK_SIZE, FILE_MAX_CONCURRENT, FILE_TRANSFER_PUSH_CHANNEL } from '../../shared/file/channels'
import { canCancelTransfer } from '../../shared/file/transferControl'
import { clampTransferStartOffset } from '../../shared/file/transferOffset'
import { throwLanpm } from '../../shared/errors/lanpmError'
import { isRemotePendingPath } from '../../shared/file/sync'
import { getSetupStatus } from '../identity/setup'
import {
  getFileById,
  insertFile,
  listFilesByGroup
} from '../storage/repositories/fileRepository'
import {
  countActiveTransfers,
  finishTransfer,
  getTransferById,
  insertTransfer,
  listTransferHistory,
  listTransfersByGroup,
  updateTransferProgress
} from '../storage/repositories/fileTransferRepository'
import { chunkDelayMs, getFileTransferSettings } from './transferSettings.ts'
import { generatePreview } from './previewService.ts'
import { previewUrlForFileId } from './previewProtocol.ts'
import {
  filesRootDir,
  resolveFileDiskPath,
  resolvePreviewDiskPath
} from './storagePathResolver.ts'
import { resolveSafePath } from '../gateway/pathGuard.ts'
import { assertSafeFileName, assertSafePathSegment } from '../../shared/fs/safeSegment.ts'
import { assertFileWritable } from './fileServiceHelpers'
import { showOpenDialog, showSaveDialog } from '../systemDialog'
import { cancelPullByTransferId, publishFileMeta, pullRemoteFile } from './fileSyncService'
import { broadcastToAllWindows } from '../utils/broadcast'

/** 本机假上传循环协作取消 */
const cancelRequested = new Set<string>()


function broadcastTransfers(groupId: string): void {
  broadcastToAllWindows(FILE_TRANSFER_PUSH_CHANNEL, groupId)
}

export function listGroupFiles(
  db: Database,
  groupId: string,
  category?: FileCategory
): FileMeta[] {
  return listFilesByGroup(db, groupId, category)
}

export function listGroupTransfers(db: Database, groupId: string) {
  return listTransfersByGroup(db, groupId)
}

export function listGroupTransferHistory(db: Database, groupId: string) {
  return listTransferHistory(db, groupId)
}

export { getFileTransferSettings, setFileTransferRateKbps } from './transferSettings.ts'
export type { FileTransferSettings } from './transferSettings.ts'

function sha256File(path: string): string {
  const buf = readFileSync(path)
  return createHash('sha256').update(buf).digest('hex')
}

/** DATA-XFER-SIM — 本机 fromDevice=toDevice 仅模拟进度条；真网走 file_chunk */
async function runChunkedUpload(
  db: Database,
  meta: FileMeta,
  deviceId: string,
  options?: { transferId?: string; startOffset?: number }
): Promise<void> {
  while (countActiveTransfers(db) >= FILE_MAX_CONCURRENT) {
    if (options?.transferId && cancelRequested.has(options.transferId)) {
      cancelRequested.delete(options.transferId)
      finishTransfer(db, options.transferId, 'cancelled')
      broadcastTransfers(meta.groupId)
      return
    }
    await new Promise((r) => setTimeout(r, 100))
  }

  const totalBytes = meta.size
  let offset = clampTransferStartOffset(options?.startOffset, totalBytes)

  const transferId = options?.transferId ?? `xfer_${randomUUID()}`
  if (!options?.transferId) {
    insertTransfer(db, {
      transferId,
      fileId: meta.fileId,
      groupId: meta.groupId,
      direction: 'upload',
      fromDeviceId: deviceId,
      toDeviceId: deviceId,
      status: offset > 0 ? 'transferring' : 'transferring',
      totalBytes,
      transferredBytes: offset,
      chunkSize: FILE_CHUNK_SIZE,
      checksum: meta.sha256,
      startedAt: new Date().toISOString()
    })
  } else {
    updateTransferProgress(db, transferId, offset, 'transferring')
  }
  broadcastTransfers(meta.groupId)

  if (cancelRequested.has(transferId)) {
    cancelRequested.delete(transferId)
    finishTransfer(db, transferId, 'cancelled')
    broadcastTransfers(meta.groupId)
    return
  }

  const { rateKbps } = getFileTransferSettings(db)
  while (offset < totalBytes) {
    const live = getTransferById(db, transferId)
    if (
      cancelRequested.has(transferId) ||
      !live ||
      !canCancelTransfer(live.status)
    ) {
      cancelRequested.delete(transferId)
      if (live && canCancelTransfer(live.status)) {
        finishTransfer(db, transferId, 'cancelled')
        broadcastTransfers(meta.groupId)
      }
      return
    }
    const prev = offset
    offset = Math.min(totalBytes, offset + FILE_CHUNK_SIZE)
    const chunkBytes = offset - prev
    updateTransferProgress(db, transferId, offset, 'transferring')
    broadcastTransfers(meta.groupId)
    await new Promise((r) => setTimeout(r, chunkDelayMs(chunkBytes, rateKbps)))
  }

  if (cancelRequested.has(transferId)) {
    cancelRequested.delete(transferId)
    const cur = getTransferById(db, transferId)
    if (cur && canCancelTransfer(cur.status)) {
      finishTransfer(db, transferId, 'cancelled')
      broadcastTransfers(meta.groupId)
    }
    return
  }

  const after = getTransferById(db, transferId)
  if (!after || after.status === 'cancelled') {
    cancelRequested.delete(transferId)
    return
  }

  finishTransfer(db, transferId, 'completed')
  broadcastTransfers(meta.groupId)
}

/** PRD-F-10 — 从已中断的分片进度续传（upload 假分片 / download P2P pull） */
export async function resumeTransfer(db: Database, transferId: string): Promise<FileTransferView> {
  const transfer = getTransferById(db, transferId)
  if (!transfer) throwLanpm('err.transferNotFound')

  const resumable =
    transfer.status === 'failed' ||
    transfer.status === 'paused' ||
    transfer.status === 'cancelled' ||
    (transfer.direction === 'download' && transfer.status === 'transferring')
  if (!resumable) {
    throwLanpm('err.transferResumeInvalid')
  }
  if (transfer.transferredBytes <= 0 || transfer.transferredBytes >= transfer.totalBytes) {
    throwLanpm('err.transferNoProgress')
  }

  const meta = getFileById(db, transfer.fileId)
  if (!meta) throwLanpm('err.fileNotFound')

  const status = getSetupStatus(db)
  if (!status.configured || !status.device) throwLanpm('stub.identityRequired')

  if (transfer.direction === 'download') {
    if (!isRemotePendingPath(meta.storagePath)) {
      throwLanpm('err.transferResumeInvalid')
    }
    await pullRemoteFile(db, transfer.fileId, { resumeTransferId: transferId })
    return getTransferById(db, transferId)!
  }

  await runChunkedUpload(db, meta, status.device.deviceId, {
    transferId,
    startOffset: transfer.transferredBytes
  })
  return getTransferById(db, transferId)!
}

/** 取消进行中/排队传输；保留已写入进度与 .partial 供续传 */
export function cancelTransfer(db: Database, transferId: string): FileTransferView {
  const transfer = getTransferById(db, transferId)
  if (!transfer) throwLanpm('err.transferNotFound')
  if (!canCancelTransfer(transfer.status)) {
    throwLanpm('err.transferCancelInvalid')
  }

  if (transfer.direction === 'download') {
    const aborted = cancelPullByTransferId(db, transferId)
    if (!aborted) {
      finishTransfer(db, transferId, 'cancelled')
      broadcastTransfers(transfer.groupId)
    }
    return getTransferById(db, transferId)!
  }

  cancelRequested.add(transferId)
  finishTransfer(db, transferId, 'cancelled')
  broadcastTransfers(transfer.groupId)
  return getTransferById(db, transferId)!
}

export async function uploadFileFromPath(
  db: Database,
  groupId: string,
  sourcePath: string
): Promise<FileMeta> {
  assertFileWritable(db, groupId)
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    throwLanpm('stub.identityRequired')
  }
  if (!existsSync(sourcePath)) throwLanpm('err.fileNotFound')
  assertSafePathSegment(groupId, 'groupId')

  const name = basename(sourcePath)
  assertSafeFileName(name)
  const ext = extname(name).replace('.', '') || 'bin'
  const fileId = `file_${randomUUID()}`
  const groupDir = resolveSafePath(filesRootDir(), groupId)
  mkdirSync(groupDir, { recursive: true })
  const destPath = resolveSafePath(groupDir, `${fileId}_${name}`)
  copyFileSync(sourcePath, destPath)

  const now = new Date().toISOString()
  const meta: FileMeta = {
    fileId,
    groupId,
    name,
    ext,
    category: inferCategory(ext),
    size: statSync(destPath).size,
    uploadedBy: status.user.userId,
    uploadedAt: now,
    sha256: sha256File(destPath),
    storagePath: destPath,
    previewStatus: 'none',
    isBookmark: false,
    updatedAt: now
  }

  insertFile(db, meta)
  publishFileMeta(db, meta)
  await runChunkedUpload(db, meta, status.device.deviceId)
  await generatePreview(db, meta)
  return getFileById(db, fileId)!
}

export async function uploadFileFromBuffer(
  db: Database,
  groupId: string,
  buffer: Buffer,
  name: string
): Promise<FileMeta> {
  assertFileWritable(db, groupId)
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    throwLanpm('stub.identityRequired')
  }

  assertSafePathSegment(groupId, 'groupId')
  const safeName = basename(name)
  assertSafeFileName(safeName)
  const ext = extname(safeName).replace('.', '') || 'bin'
  const fileId = `file_${randomUUID()}`
  const groupDir = resolveSafePath(filesRootDir(), groupId)
  mkdirSync(groupDir, { recursive: true })
  const destPath = resolveSafePath(groupDir, `${fileId}_${safeName}`)
  writeFileSync(destPath, buffer)

  const now = new Date().toISOString()
  const meta: FileMeta = {
    fileId,
    groupId,
    name: safeName,
    ext,
    category: inferCategory(ext),
    size: buffer.byteLength,
    uploadedBy: status.user.userId,
    uploadedAt: now,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    storagePath: destPath,
    previewStatus: 'none',
    isBookmark: false,
    updatedAt: now
  }

  insertFile(db, meta)
  publishFileMeta(db, meta)
  await runChunkedUpload(db, meta, status.device.deviceId)
  await generatePreview(db, meta)
  return getFileById(db, fileId)!
}

export { pullRemoteFile }

export function readPreviewText(db: Database, fileId: string): string | null {
  const meta = getFileById(db, fileId)
  if (!meta || meta.isBookmark) return null
  if (!isTextPreviewFile(meta.name, meta.ext)) return null
  const diskPath = resolveFileDiskPath(meta)
  if (!diskPath) return null
  
  const buf = readFileSync(diskPath)
  return buf.subarray(0, TEXT_PREVIEW_MAX_BYTES).toString('utf8')
}

export async function pickAndUploadFile(
  db: Database,
  groupId: string,
  parent?: BrowserWindow | null
): Promise<FileMeta | null> {
  const result = await showOpenDialog(parent, {
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths[0]) return null
  return uploadFileFromPath(db, groupId, result.filePaths[0])
}

export function resolvePreviewUrl(db: Database, fileId: string): string | null {
  const meta = getFileById(db, fileId)
  if (!meta || meta.isBookmark) return null

  if (meta.previewStatus === 'ready' && resolvePreviewDiskPath(meta)) {
    return previewUrlForFileId(fileId)
  }
  if (supportsInlinePreview(meta) && resolveFileDiskPath(meta)) {
    return previewUrlForFileId(fileId)
  }
  return null
}

export async function downloadFileToDisk(
  db: Database,
  fileId: string,
  parent?: BrowserWindow | null
): Promise<string | null> {
  const meta = getFileById(db, fileId)
  if (!meta) throwLanpm('err.fileNotFound')
  if (meta.isBookmark) throwLanpm('err.bookmarkOpenExternal')
  if (isRemotePendingPath(meta.storagePath)) {
    throwLanpm('err.fileRemoteRequired')
  }
  const diskPath = resolveFileDiskPath(meta)
  if (!diskPath) throwLanpm('err.fileLocalMissing')

  const result = await showSaveDialog(parent, { defaultPath: meta.name })
  if (result.canceled || !result.filePath) return null
  copyFileSync(diskPath, result.filePath)
  return result.filePath
}
