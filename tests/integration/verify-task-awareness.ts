/**
 * TASK-182 — task_awareness focus Presence: wiring + encode/apply + publishable.
 * Run: npm run verify:task-awareness
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as Y from 'yjs'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate
} from 'y-protocols/awareness'
import { NetworkStub } from '../../src/main/network/stub/NetworkStub.ts'
import { assertPublishableSyncType } from '../../src/shared/network/unimplementedSync.ts'
import {
  decodeTaskAwarenessUpdate,
  isTaskAwarenessLocalState,
  isTaskAwarenessPayload,
  taskAwarenessPayloadFromUpdate
} from '../../src/shared/task/taskAwareness.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

const syncSrc = readFileSync(join(projectRoot, 'src/main/task/taskSyncService.ts'), 'utf8')
const awarenessSrc = readFileSync(
  join(projectRoot, 'src/main/task/taskAwarenessService.ts'),
  'utf8'
)
const channelsSrc = readFileSync(join(projectRoot, 'src/shared/task/channels.ts'), 'utf8')
const typesSrc = readFileSync(join(projectRoot, 'src/shared/network/types.ts'), 'utf8')

assert.match(typesSrc, /task_awareness/)
assert.match(syncSrc, /handleIncomingTaskAwareness/)
assert.match(syncSrc, /ensureTaskAwarenessWired/)
assert.match(awarenessSrc, /setLocalTaskAwareness/)
assert.match(awarenessSrc, /TASK_AWARENESS_REMOTE_ORIGIN/)
assert.match(channelsSrc, /TASK_AWARENESS_PUSH_CHANNEL/)
assert.match(channelsSrc, /setAwareness/)

assert.doesNotThrow(() => assertPublishableSyncType('task_awareness'))

const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
}
assert.ok(pkg.dependencies?.['y-protocols'], 'y-protocols required')

const docA = new Y.Doc()
const docB = new Y.Doc()
const a = new Awareness(docA)
const b = new Awareness(docB)

const local = {
  userId: 'u-a',
  displayName: 'Alice',
  focusedTaskId: 'task-1',
  view: 'board' as const
}
assert.ok(isTaskAwarenessLocalState(local))
a.setLocalState(local)

const update = encodeAwarenessUpdate(a, [a.clientID])
const payload = taskAwarenessPayloadFromUpdate('g1', update)
assert.ok(isTaskAwarenessPayload(payload))
assert.equal(payload.docId, 'task:g1')

applyAwarenessUpdate(b, decodeTaskAwarenessUpdate(payload), 'remote')
const remote = [...b.getStates().values()].find(
  (s) => isTaskAwarenessLocalState(s) && s.userId === 'u-a'
)
assert.ok(remote)
assert.equal(remote.focusedTaskId, 'task-1')
assert.equal(remote.view, 'board')

const stub = new NetworkStub({
  deviceId: 'dev_a',
  userId: 'user_a',
  displayName: 'A'
})
stub.start()
await stub.publish({
  version: 1,
  type: 'task_awareness',
  msgId: 'ta_test',
  senderUserId: 'user_a',
  senderDeviceId: 'dev_a',
  groupId: 'g1',
  ts: new Date().toISOString(),
  payload,
  nonce: '',
  authTag: ''
})
stub.stop()

a.destroy()
b.destroy()
docA.destroy()
docB.destroy()

console.log('verify:task-awareness OK (wiring + Presence round-trip + publish)')
