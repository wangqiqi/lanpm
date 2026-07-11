import type { Database } from 'better-sqlite3'
import type { WhiteboardScene } from '../../../shared/whiteboard/types'
import { buildWhiteboardScene } from '../../../shared/whiteboard/types'

type Row = {
  group_id: string
  scene_json: string
  linked_task_id: string | null
  updated_at: string
}

function rowToScene(row: Row): WhiteboardScene {
  return buildWhiteboardScene(
    row.group_id,
    row.scene_json,
    row.linked_task_id ?? undefined,
    row.updated_at
  )
}

export function getWhiteboardScene(db: Database, groupId: string): WhiteboardScene | null {
  const row = db
    .prepare(
      `SELECT group_id, scene_json, linked_task_id, updated_at
       FROM whiteboard_scenes WHERE group_id = ?`
    )
    .get(groupId) as Row | undefined
  return row ? rowToScene(row) : null
}

export function upsertWhiteboardScene(
  db: Database,
  groupId: string,
  sceneJson: string,
  linkedTaskId: string | null | undefined,
  updatedAt: string
): WhiteboardScene {
  const existing = getWhiteboardScene(db, groupId)
  let nextLinked: string | null
  if (linkedTaskId === null) {
    nextLinked = null
  } else if (linkedTaskId === undefined) {
    nextLinked = existing?.linkedTaskId ?? null
  } else {
    nextLinked = linkedTaskId
  }

  db.prepare(
    `INSERT INTO whiteboard_scenes (group_id, scene_json, linked_task_id, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(group_id) DO UPDATE SET
       scene_json = excluded.scene_json,
       linked_task_id = excluded.linked_task_id,
       updated_at = excluded.updated_at`
  ).run(groupId, sceneJson, nextLinked, updatedAt)

  const saved = getWhiteboardScene(db, groupId)
  if (!saved) throw new Error('whiteboard scene upsert failed')
  return saved
}

export function deleteWhiteboardScene(db: Database, groupId: string): void {
  db.prepare(`DELETE FROM whiteboard_scenes WHERE group_id = ?`).run(groupId)
}
