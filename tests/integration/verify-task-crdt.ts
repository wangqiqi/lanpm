/**
 * TASK-161 — Yjs task_crdt offline state-vector catch-up + aggregate smoke.
 * Run: npm run verify:task-crdt
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  encodeStateVectorBase64,
  isTaskCrdtSyncBatchPayload,
  isTaskCrdtSyncRequestPayload,
  taskCrdtDocId,
  decodeTaskCrdtUpdate
} from '../../src/shared/task/taskCrdt.ts'
import {
  applyEncodedUpdate,
  applyTaskToDoc,
  countTasksInDoc,
  createEmptyTaskDoc,
  encodeDocStateAsUpdate,
  encodeDocStateVector
} from '../../src/shared/task/taskCrdtModel.ts'
import { assertPublishableSyncType } from '../../src/shared/network/unimplementedSync.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

// --- static wiring ---
const syncSrc = readFileSync(join(projectRoot, 'src/main/task/taskSyncService.ts'), 'utf8')
const offlineSrc = readFileSync(
  join(projectRoot, 'src/main/task/taskCrdtOfflineSyncService.ts'),
  'utf8'
)
assert.match(syncSrc, /task_crdt_sync_request/)
assert.match(syncSrc, /task_crdt_sync_batch/)
assert.match(syncSrc, /handleTaskCrdtSyncRequest/)
assert.match(syncSrc, /wireTaskCrdtOfflineSync/)
assert.match(offlineSrc, /encodeDocStateAsUpdate/)
assert.match(offlineSrc, /requestTaskCrdtOfflineSync/)

assert.doesNotThrow(() => assertPublishableSyncType('task_crdt_sync_request'))
assert.doesNotThrow(() => assertPublishableSyncType('task_crdt_sync_batch'))

// --- state-vector catch-up (A has tasks B lacks) ---
const docA = createEmptyTaskDoc()
applyTaskToDoc(docA, {
  taskId: 't1',
  groupId: 'g1',
  title: 'Offline A',
  status: 'todo',
  priority: 'medium',
  progressPercent: 0,
  sortOrder: 0,
  createdBy: 'ua',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
})
applyTaskToDoc(docA, {
  taskId: 't2',
  groupId: 'g1',
  title: 'Also A',
  status: 'doing',
  priority: 'high',
  progressPercent: 50,
  sortOrder: 1,
  createdBy: 'ua',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T01:00:00.000Z'
})

const docB = createEmptyTaskDoc()
const svB = encodeDocStateVector(docB)
const req = {
  docId: taskCrdtDocId('g1'),
  stateVectorBase64: encodeStateVectorBase64(svB)
}
assert.ok(isTaskCrdtSyncRequestPayload(req))

const diffUpdate = encodeDocStateAsUpdate(docA, svB)
assert.ok(diffUpdate.byteLength > 0)

const batch = {
  docId: taskCrdtDocId('g1'),
  updateBase64: Buffer.from(diffUpdate).toString('base64')
}
assert.ok(isTaskCrdtSyncBatchPayload(batch))

applyEncodedUpdate(docB, decodeTaskCrdtUpdate(batch), 'remote')
assert.equal(countTasksInDoc(docB), 2)
assert.equal(docB.getMap('tasks').get('t1')?.get('title'), 'Offline A')
assert.equal(docB.getMap('tasks').get('t2')?.get('title'), 'Also A')

// already-synced → applying further diff must not grow task count
const emptyish = encodeDocStateAsUpdate(docA, encodeDocStateVector(docB))
applyEncodedUpdate(docB, emptyish, 'remote')
assert.equal(countTasksInDoc(docB), 2)

console.log('verify:task-crdt OK (wiring + state-vector catch-up)')
