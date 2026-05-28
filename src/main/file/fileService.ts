import { createHash, randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'fs'
import { extname, join } from 'path'
import { app, BrowserWindow, dialog } from 'electron'
import type { FileCategory, FileMeta } from '../../shared/file/types'
import { inferCategory } from '../../shared/file/types'
import { FILE_CHUNK_SIZE, FILE_MAX_CONCURRENT, FILE_TRANSFER_PUSH_CHANNEL } from '../../shared/file/channels'
import { getSetupStatus } from '../identity/setup'
import {
  getFileById,
  insertFile,
  listFilesByGroup,
  updateFilePreview
} from '../storage/repositories/fileRepository'
import {
  countActiveTransfers,
  finishTransfer,
  insertTransfer,
  listTransfersByGroup,
  updateTransferProgress
} from '../storage/repositories/fileTransferRepository'
import { generatePreview } from './previewService.ts'

function filesRootDir(): string {
  const dir = join(app.getPath('userData'), 'files')
  mkdirSync(dir, { recursive: true })
  return dir
}

function broadcastTransfers(groupId: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(FILE_TRANSFER_PUSH_CHANNEL, groupId)
  }
}

function assertFileWritable(groupId: string): void {
  if (groupId.startsWith('dm:')) throw new Error('私聊不支持文件')
  if (groupId === 'demo-anonymous') throw new Error('匿名群不支持文件')
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

function sha256File(path: string): string {
  const buf = readFileSync(path)
  return createHash('sha256').update(buf).digest('hex')
}

async function runChunkedUpload(
  db: Database,
  meta: FileMeta,
  deviceId: string
): Promise<void> {
  while (countActiveTransfers(db) >= FILE_MAX_CONCURRENT) {
    await new Promise((r) => setTimeout(r, 100))
  }

  const transferId = `xfer_${randomUUID()}`
  const totalBytes = meta.size
  insertTransfer(db, {
    transferId,
    fileId: meta.fileId,
    groupId: meta.groupId,
    direction: 'upload',
    fromDeviceId: deviceId,
    toDeviceId: deviceId,
    status: 'transferring',
    totalBytes,
    transferredBytes: 0,
    chunkSize: FILE_CHUNK_SIZE,
    checksum: meta.sha256,
    startedAt: new Date().toISOString()
  })
  broadcastTransfers(meta.groupId)

  let offset = 0
  while (offset < totalBytes) {
    offset = Math.min(totalBytes, offset + FILE_CHUNK_SIZE)
    updateTransferProgress(db, transferId, offset, 'transferring')
    broadcastTransfers(meta.groupId)
    await new Promise((r) => setTimeout(r, 20))
  }

  finishTransfer(db, transferId, 'completed')
  broadcastTransfers(meta.groupId)
}

export async function uploadFileFromPath(
  db: Database,
  groupId: string,
  sourcePath: string
): Promise<FileMeta> {
  assertFileWritable(groupId)
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    throw new Error('请先完成身份配置')
  }
  if (!existsSync(sourcePath)) throw new Error('文件不存在')

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
  await runChunkedUpload(db, meta, status.device.deviceId)
  const previewStatus = await generatePreview(db, meta)
  updateFilePreview(db, fileId, previewStatus, meta.previewPath)
  return getFileById(db, fileId)!
}

export async function pickAndUploadFile(db: Database, groupId: string): Promise<FileMeta | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths[0]) return null
  return uploadFileFromPath(db, groupId, result.filePaths[0])
}

export function resolvePreviewUrl(db: Database, fileId: string): string | null {
  const meta = getFileById(db, fileId)
  if (!meta) return null
  if (meta.previewStatus === 'ready' && meta.previewPath && existsSync(meta.previewPath)) {
    return `file://${meta.previewPath}`
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'txt', 'md', 'json', 'pdf'].includes(meta.ext.toLowerCase())) {
    if (existsSync(meta.storagePath)) return `file://${meta.storagePath}`
  }
  return null
}
