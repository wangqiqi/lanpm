/**
 * B-01 — task_patch LWW 同步冒烟（repository + Stub 双实例）。
 * Run: npm run verify:task-sync
 */
import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { SyncEnvelope } from '../src/shared/network/types.ts'
import type { TaskPatchPayload } from '../src/shared/task/sync.ts'
import type { Task } from '../src/shared/task/types.ts'
import { NetworkStub } from '../src/main/network/stub/NetworkStub.ts'
import { insertGroup } from '../src/main/storage/repositories/groupRepository.ts'
import { setMeta } from '../src/main/storage/repositories/syncMetaRepository.ts'
import { upsertDevice } from '../src/main/storage/repositories/deviceRepository.ts'
import { upsertUser } from '../src/main/storage/repositories/userRepository.ts'
import {
  applyRemoteTaskDelete,
  buildTaskFromInput,
  getMaxSortOrderInColumn,
  insertTask,
  listTasksByGroup,
  upsertTaskFromRemote
} from '../src/main/storage/repositories/taskRepository.ts'

const root = dirname(fileURLToPath(import.meta.url))
const schemaSql = readFileSync(join(root, '../src/main/storage/schema.sql'), 'utf8')
const GROUP = 'demo-project'

function seedDb(db: Database.Database, userId: string, deviceId: string): void {
  const now = new Date().toISOString()
  upsertUser(db, {
    userId,
    displayName: userId,
    baseName: userId.slice(0, 8),
    suffix: 1,
    createdAt: now,
    updatedAt: now
  })
  upsertDevice(db, { deviceId, deviceName: 'verify', userId, lastSeenAt: now })
  setMeta(db, 'local_device_id', deviceId)
  insertGroup(db, {
    groupId: GROUP,
    type: 'project',
    name: 'Demo',
    createdBy: userId,
    createdAt: now,
    autoDiscover: true
  })
}

function applyTaskPatch(db: Database.Database, localDeviceId: string, envelope: SyncEnvelope): void {
  if (envelope.type !== 'task_patch' || !envelope.groupId) return
  if (envelope.senderDeviceId === localDeviceId) return
  const payload = envelope.payload as TaskPatchPayload
  if (!payload?.task?.taskId) return
  const task: Task = { ...payload.task, groupId: envelope.groupId }
  if (payload.action === 'delete') applyRemoteTaskDelete(db, task)
  else upsertTaskFromRemote(db, task)
}

function openDb(userId: string, deviceId: string): Database.Database {
  const dir = mkdtempSync(join(tmpdir(), 'lanpm-task-sync-'))
  const db = new Database(join(dir, 'test.db'))
  db.exec(schemaSql)
  seedDb(db, userId, deviceId)
  return db
}

const dbA = openDb('user_task_a', 'dev_task_a')
const dbB = openDb('user_task_b', 'dev_task_b')

const stubA = new NetworkStub({
  deviceId: 'dev_task_a',
  userId: 'user_task_a',
  displayName: 'Task A'
})
const stubB = new NetworkStub({
  deviceId: 'dev_task_b',
  userId: 'user_task_b',
  displayName: 'Task B'
})

stubA.start()
stubB.start()
stubB.subscribe(GROUP, (env) => applyTaskPatch(dbB, 'dev_task_b', env))

try {
  const task = buildTaskFromInput(
    { groupId: GROUP, title: 'Synced task', status: 'todo' },
    'user_task_a',
    `task_${randomUUID()}`
  )
  task.sortOrder = getMaxSortOrderInColumn(dbA, GROUP, 'todo') + 1
  insertTask(dbA, task)

  const payload: TaskPatchPayload = { action: 'upsert', task }
  await stubA.publish({
    version: 1,
    type: 'task_patch',
    msgId: `tp_${task.taskId}`,
    senderUserId: 'user_task_a',
    senderDeviceId: 'dev_task_a',
    groupId: GROUP,
    ts: task.updatedAt,
    payload,
    nonce: '',
    authTag: ''
  })
  await new Promise((r) => setTimeout(r, 500))

  const onB = listTasksByGroup(dbB, GROUP)
  if (onB.length !== 1 || onB[0]?.title !== 'Synced task') {
    throw new Error('task_patch upsert did not replicate to B')
  }

  const deleted: TaskPatchPayload = {
    action: 'delete',
    task: { ...task, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  }
  await stubA.publish({
    version: 1,
    type: 'task_patch',
    msgId: `tp_del_${task.taskId}`,
    senderUserId: 'user_task_a',
    senderDeviceId: 'dev_task_a',
    groupId: GROUP,
    ts: deleted.task.updatedAt,
    payload: deleted,
    nonce: '',
    authTag: ''
  } satisfies SyncEnvelope)
  await new Promise((r) => setTimeout(r, 500))

  if (listTasksByGroup(dbB, GROUP).length !== 0) {
    throw new Error('task_patch delete did not replicate to B')
  }
} finally {
  stubA.stop()
  stubB.stop()
  dbA.close()
  dbB.close()
}

console.log('verify:task-sync OK')
