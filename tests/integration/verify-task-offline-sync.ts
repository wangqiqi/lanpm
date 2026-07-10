/**
 * TASK-134 — task_sync_request → task_sync_batch offline pull (+ pagination).
 * Run: npm run verify:task-offline-sync
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import {
  TASK_OFFLINE_SYNC_BATCH_LIMIT,
  type TaskSyncBatchPayload,
  type TaskSyncRequestPayload
} from '../../src/shared/task/offlineSync.ts'
import { offlineSyncCutoffIso } from '../../src/shared/chat/offlineSync.ts'
import { SYNC_WINDOW_DAYS } from '../../src/shared/data/retention.ts'
import { NetworkStub } from '../../src/main/network/stub/NetworkStub.ts'
import { insertGroup } from '../../src/main/storage/repositories/groupRepository.ts'
import { setMeta } from '../../src/main/storage/repositories/syncMetaRepository.ts'
import { upsertDevice } from '../../src/main/storage/repositories/deviceRepository.ts'
import { upsertUser } from '../../src/main/storage/repositories/userRepository.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'
import {
  applyRemoteTaskDelete,
  buildTaskFromInput,
  insertTask,
  listTasksByGroup,
  listTasksSince,
  softDeleteTask,
  upsertTaskFromRemote
} from '../../src/main/storage/repositories/taskRepository.ts'
import {
  applyRemoteDepPatch,
  listDependenciesByGroup,
  listDependenciesSince,
  upsertDependency
} from '../../src/main/storage/repositories/taskDependencyRepository.ts'
import type { Task } from '../../src/shared/task/types.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const _tempDirs: string[] = []
const GROUP = 'demo-task-offline'

function openDb(userId: string, deviceId: string): Database.Database {
  const dir = mkLanpmTemp('lanpm-task-offline-')
  _tempDirs.push(dir)
  const db = new Database(join(dir, 'test.db'))
  db.exec(schemaSql)
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
    name: 'Task Offline',
    createdBy: userId,
    createdAt: now,
    autoDiscover: true
  })
  return db
}

function makeTask(db: Database.Database, title: string, userId: string, updatedAt: string): Task {
  const task = buildTaskFromInput(
    { groupId: GROUP, title, status: 'todo' },
    userId,
    `task_${randomUUID()}`
  )
  task.createdAt = updatedAt
  task.updatedAt = updatedAt
  insertTask(db, task)
  return task
}

async function waitUntil(predicate: () => boolean, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms
  while (!predicate() && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50))
  }
  return predicate()
}

async function respondToTaskSyncRequest(
  db: Database.Database,
  stub: NetworkStub,
  localDeviceId: string,
  localUserId: string,
  envelope: SyncEnvelope
): Promise<void> {
  if (envelope.type !== 'task_sync_request' || !envelope.groupId) return
  if (envelope.senderDeviceId === localDeviceId) return
  const payload = envelope.payload as TaskSyncRequestPayload
  if (!payload?.minUpdatedAt) return

  let sinceUpdatedAt = payload.sinceUpdatedAt ?? ''
  for (let page = 0; page < 50; page++) {
    const rawTasks = listTasksSince(
      db,
      envelope.groupId,
      sinceUpdatedAt,
      payload.minUpdatedAt,
      TASK_OFFLINE_SYNC_BATCH_LIMIT + 1
    )
    const rawDeps = listDependenciesSince(
      db,
      envelope.groupId,
      sinceUpdatedAt,
      payload.minUpdatedAt,
      TASK_OFFLINE_SYNC_BATCH_LIMIT + 1
    )
    type Merged =
      | { kind: 'task'; updatedAt: string; task: Task }
      | { kind: 'dep'; updatedAt: string; dep: ReturnType<typeof listDependenciesSince>[number] }
    const merged: Merged[] = [
      ...rawTasks.map((task) => ({ kind: 'task' as const, updatedAt: task.updatedAt, task })),
      ...rawDeps.map((dep) => ({ kind: 'dep' as const, updatedAt: dep.updatedAt, dep }))
    ].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))

    const hasMore = merged.length > TASK_OFFLINE_SYNC_BATCH_LIMIT
    const pageItems = hasMore ? merged.slice(0, TASK_OFFLINE_SYNC_BATCH_LIMIT) : merged
    const tasks = pageItems.filter((i) => i.kind === 'task').map((i) => i.task)
    const dependencies = pageItems.filter((i) => i.kind === 'dep').map((i) => i.dep)

    if (tasks.length > 0 || dependencies.length > 0) {
      const batchPayload: TaskSyncBatchPayload = { tasks, dependencies, hasMore }
      await stub.publish({
        version: 1,
        type: 'task_sync_batch',
        msgId: `task_sync_batch_${randomUUID()}`,
        senderUserId: localUserId,
        senderDeviceId: localDeviceId,
        groupId: envelope.groupId,
        ts: new Date().toISOString(),
        payload: batchPayload,
        nonce: '',
        authTag: ''
      })
    }
    if (!hasMore || pageItems.length === 0) break
    sinceUpdatedAt = pageItems[pageItems.length - 1]!.updatedAt
  }
}

function applyTaskSyncBatch(db: Database.Database, localDeviceId: string, envelope: SyncEnvelope): void {
  if (envelope.type !== 'task_sync_batch' || !envelope.groupId) return
  if (envelope.senderDeviceId === localDeviceId) return
  const payload = envelope.payload as TaskSyncBatchPayload
  const cutoff = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)
  for (const task of payload.tasks ?? []) {
    if (!task?.taskId || task.updatedAt < cutoff) continue
    if (task.deletedAt) applyRemoteTaskDelete(db, { ...task, groupId: envelope.groupId }, envelope.senderDeviceId)
    else upsertTaskFromRemote(db, { ...task, groupId: envelope.groupId }, envelope.senderDeviceId)
  }
  for (const dep of payload.dependencies ?? []) {
    if (!dep?.dependency || dep.updatedAt < cutoff) continue
    applyRemoteDepPatch(db, { ...dep, groupId: envelope.groupId }, envelope.senderDeviceId)
  }
}

// --- Case 1: upsert + dep + soft-delete ---
{
  const DEVICE_A = 'dev_toff_a'
  const DEVICE_B = 'dev_toff_b'
  const USER_A = 'user_toff_a'
  const USER_B = 'user_toff_b'
  const dbA = openDb(USER_A, DEVICE_A)
  const dbB = openDb(USER_B, DEVICE_B)
  const stubA = new NetworkStub({ deviceId: DEVICE_A, userId: USER_A, displayName: 'A' })
  const stubB = new NetworkStub({ deviceId: DEVICE_B, userId: USER_B, displayName: 'B' })
  stubA.start()
  stubB.start()

  try {
    const base = Date.now()
    const t1 = makeTask(dbB, 'Remote task 1', USER_B, new Date(base).toISOString())
    const t2 = makeTask(dbB, 'Remote task 2', USER_B, new Date(base + 1000).toISOString())
    upsertDependency(dbB, {
      groupId: GROUP,
      fromTaskId: t1.taskId,
      toTaskId: t2.taskId,
      type: 'FS'
    })
    softDeleteTask(dbB, t2.taskId)

    const minUpdatedAt = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)
    let batchReceived = false

    stubB.subscribe(GROUP, (env) => {
      void respondToTaskSyncRequest(dbB, stubB, DEVICE_B, USER_B, env)
    })
    stubA.subscribe(GROUP, (env) => {
      if (env.type === 'task_sync_batch') {
        applyTaskSyncBatch(dbA, DEVICE_A, env)
        batchReceived = true
      }
    })

    await stubA.publish({
      version: 1,
      type: 'task_sync_request',
      msgId: `req_${randomUUID()}`,
      senderUserId: USER_A,
      senderDeviceId: DEVICE_A,
      groupId: GROUP,
      ts: new Date().toISOString(),
      payload: { sinceUpdatedAt: '', minUpdatedAt } satisfies TaskSyncRequestPayload,
      nonce: '',
      authTag: ''
    })

    assert.ok(await waitUntil(() => batchReceived, 3000), 'task_sync_batch not received')

    const localTasks = listTasksByGroup(dbA, GROUP)
    assert.equal(localTasks.length, 1, 'active tasks after sync')
    assert.equal(localTasks[0]?.title, 'Remote task 1')
    const soft = dbA.prepare('SELECT deleted_at FROM tasks WHERE task_id = ?').get(t2.taskId) as
      | { deleted_at: string | null }
      | undefined
    assert.ok(soft?.deleted_at, 'soft-deleted task replicated')
    const depRows = listDependenciesSince(dbA, GROUP, '', minUpdatedAt, 100)
    assert.equal(depRows.length, 1, 'dependency edge replicated')
    assert.equal(depRows[0]?.dependency.fromTaskId, t1.taskId)
    assert.equal(listDependenciesByGroup(dbA, GROUP).length, 0)
    console.log('OK: task offline upsert + soft-delete + dep')
  } finally {
    stubA.stop()
    stubB.stop()
    dbA.close()
    dbB.close()
  }
}

// --- Case 2: >100 tasks pagination ---
{
  const DEVICE_C = 'dev_toff_c'
  const DEVICE_D = 'dev_toff_d'
  const USER_C = 'user_toff_c'
  const USER_D = 'user_toff_d'
  const dbC = openDb(USER_C, DEVICE_C)
  const dbD = openDb(USER_D, DEVICE_D)
  const stubC = new NetworkStub({ deviceId: DEVICE_C, userId: USER_C, displayName: 'C' })
  const stubD = new NetworkStub({ deviceId: DEVICE_D, userId: USER_D, displayName: 'D' })
  stubC.start()
  stubD.start()

  try {
    const base = Date.now()
    const TOTAL = TASK_OFFLINE_SYNC_BATCH_LIMIT + 40
    for (let i = 0; i < TOTAL; i++) {
      makeTask(dbD, `Page ${i}`, USER_D, new Date(base + 10_000 + i * 10).toISOString())
    }

    const minUpdatedAt = offlineSyncCutoffIso(SYNC_WINDOW_DAYS)
    let done = false

    stubD.subscribe(GROUP, (env) => {
      void respondToTaskSyncRequest(dbD, stubD, DEVICE_D, USER_D, env)
    })
    stubC.subscribe(GROUP, (env) => {
      if (env.type !== 'task_sync_batch') return
      applyTaskSyncBatch(dbC, DEVICE_C, env)
      const payload = env.payload as TaskSyncBatchPayload
      if (payload.hasMore) {
        const nextSince =
          [...payload.tasks.map((t) => t.updatedAt)].sort().at(-1) ?? ''
        void stubC.publish({
          version: 1,
          type: 'task_sync_request',
          msgId: `req2_${randomUUID()}`,
          senderUserId: USER_C,
          senderDeviceId: DEVICE_C,
          groupId: GROUP,
          ts: new Date().toISOString(),
          payload: { sinceUpdatedAt: nextSince, minUpdatedAt } satisfies TaskSyncRequestPayload,
          nonce: '',
          authTag: ''
        })
      } else {
        done = true
      }
    })

    await stubC.publish({
      version: 1,
      type: 'task_sync_request',
      msgId: `req_page_${randomUUID()}`,
      senderUserId: USER_C,
      senderDeviceId: DEVICE_C,
      groupId: GROUP,
      ts: new Date().toISOString(),
      payload: { sinceUpdatedAt: '', minUpdatedAt } satisfies TaskSyncRequestPayload,
      nonce: '',
      authTag: ''
    })

    assert.ok(await waitUntil(() => done && listTasksByGroup(dbC, GROUP).length === TOTAL, 8000))
    assert.equal(listTasksByGroup(dbC, GROUP).length, TOTAL)
    console.log('OK: task offline pagination >100')
  } finally {
    stubC.stop()
    stubD.stop()
    dbC.close()
    dbD.close()
  }
}

for (const d of _tempDirs) rmLanpmTemp(d)
console.log('verify:task-offline-sync OK')
