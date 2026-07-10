/**
 * TASK-131 — task_dep_patch P2P 同步冒烟（repository LWW + Stub 双实例）。
 * Run: npm run verify:task-dep-sync
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { SyncEnvelope } from '../../src/shared/network/types.ts'
import type { TaskDepPatchPayload } from '../../src/shared/task/sync.ts'
import { NetworkStub } from '../../src/main/network/stub/NetworkStub.ts'
import { insertGroup } from '../../src/main/storage/repositories/groupRepository.ts'
import { setMeta } from '../../src/main/storage/repositories/syncMetaRepository.ts'
import { upsertDevice } from '../../src/main/storage/repositories/deviceRepository.ts'
import { upsertUser } from '../../src/main/storage/repositories/userRepository.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'
import {
  buildTaskFromInput,
  getMaxSortOrderInColumn,
  insertTask
} from '../../src/main/storage/repositories/taskRepository.ts'
import {
  applyRemoteDepPatch,
  listDependenciesByGroup,
  upsertDependency
} from '../../src/main/storage/repositories/taskDependencyRepository.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
const _tempDirs: string[] = []
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

function applyDepPatch(db: Database.Database, localDeviceId: string, envelope: SyncEnvelope): void {
  if (envelope.type !== 'task_dep_patch' || !envelope.groupId) return
  if (envelope.senderDeviceId === localDeviceId) return
  const payload = envelope.payload as TaskDepPatchPayload
  if (!payload?.dependency?.fromTaskId) return
  applyRemoteDepPatch(db, { ...payload, groupId: envelope.groupId })
}

function openDb(userId: string, deviceId: string): Database.Database {
  const dir = mkLanpmTemp('lanpm-task-dep-sync-')
  _tempDirs.push(dir)
  const db = new Database(join(dir, 'test.db'))
  db.exec(schemaSql)
  seedDb(db, userId, deviceId)
  return db
}

function seedPair(db: Database.Database, userId: string): { fromId: string; toId: string } {
  const from = buildTaskFromInput(
    { groupId: GROUP, title: 'From', status: 'todo' },
    userId,
    `task_${randomUUID()}`
  )
  from.sortOrder = getMaxSortOrderInColumn(db, GROUP, 'todo') + 1
  insertTask(db, from)
  const to = buildTaskFromInput(
    { groupId: GROUP, title: 'To', status: 'todo' },
    userId,
    `task_${randomUUID()}`
  )
  to.sortOrder = getMaxSortOrderInColumn(db, GROUP, 'todo') + 1
  insertTask(db, to)
  return { fromId: from.taskId, toId: to.taskId }
}

const dbA = openDb('user_dep_a', 'dev_dep_a')
const dbB = openDb('user_dep_b', 'dev_dep_b')

const stubA = new NetworkStub({
  deviceId: 'dev_dep_a',
  userId: 'user_dep_a',
  displayName: 'Dep A'
})
const stubB = new NetworkStub({
  deviceId: 'dev_dep_b',
  userId: 'user_dep_b',
  displayName: 'Dep B'
})

stubA.start()
stubB.start()
stubB.subscribe(GROUP, (env) => applyDepPatch(dbB, 'dev_dep_b', env))

try {
  const { fromId, toId } = seedPair(dbA, 'user_dep_a')
  // B needs the same tasks for FK join in listDependenciesByGroup
  insertTask(
    dbB,
    buildTaskFromInput({ groupId: GROUP, title: 'From', status: 'todo' }, 'user_dep_a', fromId)
  )
  insertTask(
    dbB,
    buildTaskFromInput({ groupId: GROUP, title: 'To', status: 'todo' }, 'user_dep_a', toId)
  )

  const dep = upsertDependency(dbA, {
    groupId: GROUP,
    fromTaskId: fromId,
    toTaskId: toId,
    type: 'FS'
  })
  const upsertAt = new Date().toISOString()
  const upsertPayload: TaskDepPatchPayload = {
    action: 'upsert',
    groupId: GROUP,
    dependency: dep,
    updatedAt: upsertAt
  }
  await stubA.publish({
    version: 1,
    type: 'task_dep_patch',
    msgId: `tdp_${fromId}_${toId}`,
    senderUserId: 'user_dep_a',
    senderDeviceId: 'dev_dep_a',
    groupId: GROUP,
    ts: upsertAt,
    payload: upsertPayload,
    nonce: '',
    authTag: ''
  })
  await new Promise((r) => setTimeout(r, 500))

  const onB = listDependenciesByGroup(dbB, GROUP)
  if (onB.length !== 1 || onB[0]?.fromTaskId !== fromId || onB[0]?.type !== 'FS') {
    throw new Error(`task_dep_patch upsert did not replicate to B: ${JSON.stringify(onB)}`)
  }

  // LWW: older patch must not overwrite
  const older: TaskDepPatchPayload = {
    action: 'upsert',
    groupId: GROUP,
    dependency: { fromTaskId: fromId, toTaskId: toId, type: 'SS' },
    updatedAt: '2000-01-01T00:00:00.000Z'
  }
  if (applyRemoteDepPatch(dbB, older)) {
    throw new Error('older task_dep_patch must not win LWW')
  }
  if (listDependenciesByGroup(dbB, GROUP)[0]?.type !== 'FS') {
    throw new Error('LWW older upsert changed type')
  }

  const deleteAt = new Date().toISOString()
  const deletePayload: TaskDepPatchPayload = {
    action: 'delete',
    groupId: GROUP,
    dependency: dep,
    updatedAt: deleteAt
  }
  await stubA.publish({
    version: 1,
    type: 'task_dep_patch',
    msgId: `tdp_del_${fromId}_${toId}`,
    senderUserId: 'user_dep_a',
    senderDeviceId: 'dev_dep_a',
    groupId: GROUP,
    ts: deleteAt,
    payload: deletePayload,
    nonce: '',
    authTag: ''
  } satisfies SyncEnvelope)
  await new Promise((r) => setTimeout(r, 500))

  if (listDependenciesByGroup(dbB, GROUP).length !== 0) {
    throw new Error('task_dep_patch delete did not replicate to B')
  }
} finally {
  stubA.stop()
  stubB.stop()
  dbA.close()
  dbB.close()
  for (const d of _tempDirs) rmLanpmTemp(d)
}

console.log('verify:task-dep-sync OK')
