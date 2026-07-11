/**
 * Per-group whiteboard Y.Doc load / save / seed (TASK-260).
 * SQLite blob in `whiteboard_crdt_docs`; seed from `whiteboard_scenes` when no blob.
 */
import type { Database } from 'better-sqlite3'
import * as Y from 'yjs'
import {
  applyWhiteboardEncodedUpdate,
  createEmptyWhiteboardDoc,
  emptyOrScene,
  encodeWhiteboardDocState,
  pruneOversizedWhiteboardAssets,
  seedWhiteboardDocFromSceneJson,
  whiteboardDocToSceneJson
} from '../../shared/whiteboard/whiteboardCrdtModel.ts'
import { getWhiteboardCrdtBlob, upsertWhiteboardCrdtBlob } from '../storage/repositories/whiteboardCrdtRepository.ts'
import { getWhiteboardScene, upsertWhiteboardScene } from '../storage/repositories/whiteboardRepository.ts'

const docs = new Map<string, Y.Doc>()

export function loadOrCreateGroupWhiteboardDoc(db: Database, groupId: string): Y.Doc {
  const cached = docs.get(groupId)
  if (cached) return cached

  const doc = createEmptyWhiteboardDoc()
  const stored = getWhiteboardCrdtBlob(db, groupId)
  if (stored) {
    applyWhiteboardEncodedUpdate(doc, new Uint8Array(stored.updateBlob), 'load')
  } else {
    const scene = getWhiteboardScene(db, groupId)
    const sceneJson = emptyOrScene(scene?.sceneJson)
    seedWhiteboardDocFromSceneJson(doc, sceneJson, 'seed')
    persistGroupWhiteboardDoc(db, groupId, doc)
  }
  docs.set(groupId, doc)
  return doc
}

export function persistGroupWhiteboardDoc(db: Database, groupId: string, doc?: Y.Doc): void {
  const target = doc ?? docs.get(groupId)
  if (!target) return
  pruneOversizedWhiteboardAssets(target)
  const update = encodeWhiteboardDocState(target)
  upsertWhiteboardCrdtBlob(db, groupId, update)
  writebackSceneJson(db, groupId, target)
}

/** Keep `whiteboard_scenes.sceneJson` in sync for PNG export / legacy readers. */
export function writebackSceneJson(db: Database, groupId: string, doc: Y.Doc): void {
  const existing = getWhiteboardScene(db, groupId)
  const sceneJson = whiteboardDocToSceneJson(doc)
  upsertWhiteboardScene(
    db,
    groupId,
    sceneJson,
    existing?.linkedTaskId ?? null,
    new Date().toISOString()
  )
}

export function getWhiteboardDocStateBase64(db: Database, groupId: string): string {
  const doc = loadOrCreateGroupWhiteboardDoc(db, groupId)
  return Buffer.from(encodeWhiteboardDocState(doc)).toString('base64')
}

export function evictGroupWhiteboardDoc(groupId: string): void {
  const doc = docs.get(groupId)
  if (doc) {
    doc.destroy()
    docs.delete(groupId)
  }
}

export function clearWhiteboardCrdtDocCache(): void {
  for (const doc of docs.values()) {
    doc.destroy()
  }
  docs.clear()
}
