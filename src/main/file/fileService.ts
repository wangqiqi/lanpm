import { createHash, randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { extname, join } from 'path'
import { app } from 'electron'
import type { FileCategory, FileMeta, FileTransferView } from '../../shared/file/types'
import { inferCategory } from '../../shared/file/types'
import {
  isTextPreviewFile,
  supportsInlinePreview,
  TEXT_PREVIEW_MAX_BYTES
} from '../../shared/file/previewExtensions.ts'
import { FILE_CHUNK_SIZE, FILE_MAX_CONCURRENT, FILE_TRANSFER_PUSH_CHANNEL } from '../../shared/file/channels'
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
import { resolveFileDiskPath, resolvePreviewDiskPath } from './storagePathResolver.ts'
import { assertFileWritable } from './fileServiceHelpers'
import { showOpenDialog, showSaveDialog } from '../systemDialog'
import { publishFileMeta, pullRemoteFile } from './fileSyncService'
import { broadcastToAllWindows } from './utils/broadcast'

function filesRootDir(): string {
  const dir = join(app.getPath('userData'), 'files')
  mkdirSync(dir, { recursive: true })
  return dir
}

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
    await new Promise((r) => setTimeout(r, 100))
  }

  const totalBytes = meta.size
  let offset = options?.startOffset ?? 0
  if (offset >= totalBytes) offset = 0

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

  const { rateKbps } = getFileTransferSettings(db)
  while (offset < totalBytes) {
    const prev = offset
    offset = Math.min(totalBytes, offset + FILE_CHUNK_SIZE)
    const chunkBytes = offset - prev
    updateTransferProgress(db, transferId, offset, 'transferring')
    broadcastTransfers(meta.groupId)
    await new Promise((r) => setTimeout(r, chunkDelayMs(chunkBytes, rateKbps)))
  }

  finishTransfer(db, transferId, 'completed')
  broadcastTransfers(meta.groupId)
}

/** PRD-F-10 — 从已中断的分片进度续传 */
export async function resumeTransfer(db: Database, transferId: string): Promise<FileTransferView> {
  const transfer = getTransferById(db, transferId)
  if (!transfer) throwLanpm('err.transferNotFound')
  if (transfer.status !== 'failed' && transfer.status !== 'paused') {
    throwLanpm('err.transferResumeInvalid')
  }
  if (transfer.transferredBytes <= 0 || transfer.transferredBytes >= transfer.totalBytes) {
    throwLanpm('err.transferNoProgress')
  }

  const meta = getFileById(db, transfer.fileId)
  if (!meta) throwLanpm('err.fileNotFound')

  const status = getSetupStatus(db)
  if (!status.configured || !status.device) throwLanpm('stub.identityRequired')

  await runChunkedUpload(db, meta, status.device.deviceId, {
    transferId,
    startOffset: transfer.transferredBytes
  })
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

  const name = sourcePath.split(/[/\\]/).pop() ?? 'file'
  const ext = extname(name).replace('.', '') || 'bin'
  const fileId = `file_${randomUUID()}`
  const groupDir = join(filesRootDir(), groupId)
  mkdirSync(groupDir, { recursive: true })
  const destPath = join(groupDir, `${fileId}_${name}`)
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
