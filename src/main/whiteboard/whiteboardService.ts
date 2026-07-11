import type { Database } from 'better-sqlite3'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import type {
  ExportWhiteboardPngInput,
  SaveWhiteboardSceneInput,
  WhiteboardScene
} from '../../shared/whiteboard/types'
import { normalizeSceneJson } from '../../shared/whiteboard/types'
import type { FileMeta } from '../../shared/file/types'
import {
  getWhiteboardScene,
  upsertWhiteboardScene
} from '../storage/repositories/whiteboardRepository'
import { uploadFileFromPath } from '../file/fileService'
import { sendExistingFileMessage, sendTaskRefMessage } from '../chat/chatService'

export function loadWhiteboardScene(db: Database, groupId: string): WhiteboardScene | null {
  if (!groupId) throw new Error('groupId required')
  return getWhiteboardScene(db, groupId)
}

export function saveWhiteboardScene(
  db: Database,
  input: SaveWhiteboardSceneInput
): WhiteboardScene {
  if (!input.groupId) throw new Error('groupId required')
  const sceneJson = normalizeSceneJson(input.sceneJson)
  const updatedAt = new Date().toISOString()
  return upsertWhiteboardScene(db, input.groupId, sceneJson, input.linkedTaskId, updatedAt)
}

export async function exportWhiteboardPngToGroup(
  db: Database,
  input: ExportWhiteboardPngInput
): Promise<FileMeta> {
  if (!input.groupId) throw new Error('groupId required')
  if (!input.pngBase64) throw new Error('pngBase64 required')
  const buf = Buffer.from(input.pngBase64, 'base64')
  if (buf.length < 8) throw new Error('invalid png')
  const tmpDir = join(app.getPath('temp'), 'lanpm-whiteboard')
  mkdirSync(tmpDir, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 10)
  const name =
    input.fileName?.replace(/[^\w.\-()\u4e00-\u9fff]+/g, '_') ||
    `whiteboard-${input.groupId.slice(0, 8)}-${stamp}.png`
  const tmpPath = join(tmpDir, `${randomUUID()}_${name}`)
  writeFileSync(tmpPath, buf)
  const meta = await uploadFileFromPath(db, input.groupId, tmpPath)
  if (input.linkedTaskId) {
    await sendExistingFileMessage(db, input.groupId, meta.fileId)
    await sendTaskRefMessage(db, input.groupId, input.linkedTaskId)
  }
  return meta
}
