import { createHash, randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { mkdirSync, writeFileSync as writeTmp } from 'fs'
import type { FileMeta } from '../../shared/file/types.ts'
import type {
  CreateMindmapInput,
  ExportMindmapPngInput,
  MindmapDocument,
  MindmapDocumentLoad,
  MindmapDocumentSummary,
  RenameMindmapInput,
  SaveMindmapInput
} from '../../shared/mindmap/types.ts'
import {
  emptyMindmapDataJson,
  mindmapFileName,
  normalizeMindmapDataJson
} from '../../shared/mindmap/types.ts'
import { getSetupStatus } from '../identity/setup.ts'
import { uploadFileFromBuffer, uploadFileFromPath } from '../file/fileService.ts'
import { sendExistingFileMessage } from '../chat/chatService.ts'
import {
  deleteFileById,
  getFileById,
  updateFileContent,
  updateFileName
} from '../storage/repositories/fileRepository.ts'
import {
  deleteMindmapDocument,
  getMindmapDocument,
  insertMindmapDocument,
  listMindmapDocuments,
  touchMindmapDocument,
  updateMindmapDocumentTitle
} from '../storage/repositories/mindmapRepository.ts'

function sha256Buffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

function readMindmapJsonFromFile(fileId: string, db: Database): string {
  const meta = getFileById(db, fileId)
  if (!meta) throw new Error('mindmap file not found')
  return readFileSync(meta.storagePath, 'utf8')
}

function writeMindmapJsonToFile(db: Database, fileId: string, dataJson: string): void {
  const meta = getFileById(db, fileId)
  if (!meta) throw new Error('mindmap file not found')
  const normalized = normalizeMindmapDataJson(dataJson)
  const buf = Buffer.from(normalized, 'utf8')
  writeFileSync(meta.storagePath, buf)
  const updatedAt = new Date().toISOString()
  updateFileContent(db, fileId, {
    size: buf.length,
    sha256: sha256Buffer(buf),
    updatedAt
  })
}

export function listGroupMindmaps(db: Database, groupId: string): MindmapDocumentSummary[] {
  if (!groupId) throw new Error('groupId required')
  return listMindmapDocuments(db, groupId)
}

export async function createMindmapDocument(
  db: Database,
  input: CreateMindmapInput
): Promise<MindmapDocument> {
  if (!input.groupId) throw new Error('groupId required')
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) throw new Error('identity required')

  const title = input.title?.trim() || 'Mind map'
  const dataJson = emptyMindmapDataJson(title)
  const fileMeta = await uploadFileFromBuffer(
    db,
    input.groupId,
    Buffer.from(dataJson, 'utf8'),
    mindmapFileName(title)
  )

  const now = new Date().toISOString()
  const docId = `mmap_${randomUUID()}`
  return insertMindmapDocument(db, {
    docId,
    groupId: input.groupId,
    title,
    fileId: fileMeta.fileId,
    createdAt: now,
    updatedAt: now,
    createdBy: status.user.userId
  })
}

export function loadMindmapDocument(db: Database, docId: string): MindmapDocumentLoad | null {
  const doc = getMindmapDocument(db, docId)
  if (!doc) return null
  const dataJson = readMindmapJsonFromFile(doc.fileId, db)
  return { ...doc, dataJson }
}

export function saveMindmapDocument(db: Database, input: SaveMindmapInput): MindmapDocument {
  if (!input.docId) throw new Error('docId required')
  const doc = getMindmapDocument(db, input.docId)
  if (!doc) throw new Error('mindmap document not found')
  writeMindmapJsonToFile(db, doc.fileId, input.dataJson)
  const updatedAt = new Date().toISOString()
  touchMindmapDocument(db, doc.docId, updatedAt)
  const saved = getMindmapDocument(db, doc.docId)
  if (!saved) throw new Error('mindmap document save failed')
  return saved
}

export function renameMindmapDocument(db: Database, input: RenameMindmapInput): MindmapDocument {
  const title = input.title.trim()
  if (!title) throw new Error('title required')
  const doc = getMindmapDocument(db, input.docId)
  if (!doc) throw new Error('mindmap document not found')
  const updatedAt = new Date().toISOString()
  updateFileName(db, doc.fileId, mindmapFileName(title), updatedAt)
  return updateMindmapDocumentTitle(db, doc.docId, title, updatedAt)
}

export function removeMindmapDocument(db: Database, docId: string): void {
  const doc = deleteMindmapDocument(db, docId)
  if (!doc) throw new Error('mindmap document not found')
  const meta = getFileById(db, doc.fileId)
  if (meta) {
    try {
      unlinkSync(meta.storagePath)
    } catch {
      /* file may already be gone */
    }
    deleteFileById(db, doc.fileId)
  }
}

export async function exportMindmapPngToGroup(
  db: Database,
  input: ExportMindmapPngInput
): Promise<FileMeta> {
  if (!input.groupId) throw new Error('groupId required')
  if (!input.pngBase64) throw new Error('pngBase64 required')
  const doc = getMindmapDocument(db, input.docId)
  if (!doc || doc.groupId !== input.groupId) throw new Error('mindmap document not found')

  const buf = Buffer.from(input.pngBase64, 'base64')
  if (buf.length < 8) throw new Error('invalid png')
  const tmpDir = join(app.getPath('temp'), 'lanpm-mindmap')
  mkdirSync(tmpDir, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 10)
  const name =
    input.fileName?.replace(/[^\w.\-()\u4e00-\u9fff]+/g, '_') ||
    `mindmap-${doc.title.slice(0, 24)}-${stamp}.png`
  const tmpPath = join(tmpDir, `${randomUUID()}_${name}`)
  writeTmp(tmpPath, buf)
  const meta = await uploadFileFromPath(db, input.groupId, tmpPath)
  if (input.shareToChat) {
    await sendExistingFileMessage(db, input.groupId, meta.fileId)
  }
  return meta
}
