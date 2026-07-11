import type { Database } from 'better-sqlite3'
import type { SaveWhiteboardSceneInput, WhiteboardScene } from '../../shared/whiteboard/types'
import { normalizeSceneJson } from '../../shared/whiteboard/types'
import {
  getWhiteboardScene,
  upsertWhiteboardScene
} from '../storage/repositories/whiteboardRepository'

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
