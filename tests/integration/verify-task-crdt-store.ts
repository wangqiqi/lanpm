/**
 * TASK-158 — Y.Doc load/seed/persist via task_crdt_docs.
 * Run: npm run verify:task-crdt-store
 */
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { join } from 'path'
import { applyMigrations } from '../../src/main/storage/migrate.ts'
import { SCHEMA_VERSION } from '../../src/main/storage/schema.ts'
import { insertTask } from '../../src/main/storage/repositories/taskRepository.ts'
import { getTaskCrdtBlob } from '../../src/main/storage/repositories/taskCrdtRepository.ts'
import {
  clearTaskCrdtDocCache,
  loadOrCreateGroupTaskDoc,
  persistGroupTaskDoc
} from '../../src/main/task/taskCrdtStore.ts'
import {
  applyTaskToDoc,
  countTasksInDoc
} from '../../src/shared/task/taskCrdtModel.ts'
import type { Task } from '../../src/shared/task/types.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'

const dir = mkLanpmTemp('task-crdt-store-')
const dbPath = join(dir, 'lanpm.db')

try {
  clearTaskCrdtDocCache()
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')
  applyMigrations(db)
  assert.equal(db.pragma('user_version', { simple: true }), SCHEMA_VERSION)

  const tables = (
    db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='task_crdt_docs'`
      )
      .all() as { name: string }[]
  )
  assert.equal(tables.length, 1, 'task_crdt_docs missing')

  const now = '2026-07-11T00:00:00.000Z'
  const task: Task = {
    taskId: 'task-a',
    groupId: 'grp1',
    title: 'Seed me',
    status: 'todo',
    priority: 'high',
    progressPercent: 10,
    sortOrder: 1,
    createdBy: 'u1',
    createdAt: now,
    updatedAt: now,
    description: 'from sqlite'
  }
  insertTask(db, task)

  const doc = loadOrCreateGroupTaskDoc(db, 'grp1')
  assert.equal(countTasksInDoc(doc), 1)
  const stored = getTaskCrdtBlob(db, 'grp1')
  assert.ok(stored)
  assert.equal(stored.docId, 'task:grp1')

  clearTaskCrdtDocCache()
  const reloaded = loadOrCreateGroupTaskDoc(db, 'grp1')
  assert.equal(countTasksInDoc(reloaded), 1)
  assert.equal(reloaded.getMap('tasks').get('task-a')?.get('title'), 'Seed me')

  applyTaskToDoc(reloaded, { ...task, title: 'Edited', updatedAt: '2026-07-11T02:00:00.000Z' })
  persistGroupTaskDoc(db, 'grp1', reloaded)
  clearTaskCrdtDocCache()
  const again = loadOrCreateGroupTaskDoc(db, 'grp1')
  assert.equal(again.getMap('tasks').get('task-a')?.get('title'), 'Edited')

  db.close()
  console.log('verify:task-crdt-store OK (seed + persist + reload)')
} finally {
  clearTaskCrdtDocCache()
  rmLanpmTemp(dir)
}
