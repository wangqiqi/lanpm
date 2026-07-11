/**
 * Per-group Y.Doc load / save / seed (TASK-158).
 * SQLite blob in `task_crdt_docs`; seed from `tasks` when no blob yet.
 */
import type { Database } from 'better-sqlite3'
import * as Y from 'yjs'
import {
  applyEncodedUpdate,
  createEmptyTaskDoc,
  encodeDocState,
  seedDocFromTasks
} from '../../shared/task/taskCrdtModel.ts'
import { getTaskCrdtBlob, upsertTaskCrdtBlob } from '../storage/repositories/taskCrdtRepository.ts'
import { listTasksByGroupIncludingDeleted } from '../storage/repositories/taskRepository.ts'

/** In-memory cache — one Doc per group for this process. */
const docs = new Map<string, Y.Doc>()

/**
 * Load Y.Doc for group: blob if present, else seed from tasks rows and persist.
 */
export function loadOrCreateGroupTaskDoc(db: Database, groupId: string): Y.Doc {
  const cached = docs.get(groupId)
  if (cached) return cached

  const doc = createEmptyTaskDoc()
  const stored = getTaskCrdtBlob(db, groupId)
  if (stored) {
    applyEncodedUpdate(doc, new Uint8Array(stored.updateBlob), 'load')
  } else {
    const tasks = listTasksByGroupIncludingDeleted(db, groupId)
    if (tasks.length > 0) {
      seedDocFromTasks(doc, tasks, 'seed')
    }
    persistGroupTaskDoc(db, groupId, doc)
  }
  docs.set(groupId, doc)
  return doc
}

export function persistGroupTaskDoc(db: Database, groupId: string, doc?: Y.Doc): void {
  const target = doc ?? docs.get(groupId)
  if (!target) return
  const update = encodeDocState(target)
  upsertTaskCrdtBlob(db, groupId, update)
}

/** Drop cache entry (e.g. after group dissolve). Does not delete SQLite row. */
export function evictGroupTaskDoc(groupId: string): void {
  const doc = docs.get(groupId)
  if (doc) {
    doc.destroy()
    docs.delete(groupId)
  }
}

/** Test helper — clear process cache. */
export function clearTaskCrdtDocCache(): void {
  for (const doc of docs.values()) {
    doc.destroy()
  }
  docs.clear()
}
