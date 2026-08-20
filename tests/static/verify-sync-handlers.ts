/**
 * AUTO-09 — SyncEnvelope.type 在 main 层有 handler 或 post-RC 登记。
 * Run: npm run verify:sync-handlers
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot

const SYNC_TYPES = [
  'discovery',
  'heartbeat',
  'chat',
  'read_receipt',
  'task_patch',
  'task_dep_patch',
  'task_sync_request',
  'task_sync_batch',
  'task_crdt',
  'task_crdt_sync_request',
  'task_crdt_sync_batch',
  'task_awareness',
  'whiteboard_crdt',
  'whiteboard_crdt_sync_request',
  'whiteboard_crdt_sync_batch',
  'whiteboard_awareness',
  'mindmap_crdt',
  'mindmap_crdt_sync_request',
  'mindmap_crdt_sync_batch',
  'mindmap_awareness',
  'group_tag_patch',
  'group_tag_sync_request',
  'group_tag_sync_batch',
  'file_meta',
  'file_meta_sync_request',
  'file_meta_sync_batch',
  'file_pull_request',
  'file_chunk',
  'member_event',
  'group_key_rotate',
  'chat_sync_request',
  'chat_sync_batch',
  'read_receipt_sync_request',
  'read_receipt_sync_batch'
] as const

/**
 * transport-level only — discovery/heartbeat 无业务 handler。
 * task_crdt 已有 taskCrdtService（TASK-159）。
 */
const POST_RC_OR_TRANSPORT = new Set<string>(['discovery', 'heartbeat'])

/** Must be refused by publish — empty after TASK-157 */
const UNIMPLEMENTED_PUBLISH = new Set<string>()

const HANDLER_FILES = [
  'src/main/chat/chatService.ts',
  'src/main/chat/readReceiptService.ts',
  'src/main/chat/readReceiptOfflineSyncService.ts',
  'src/main/chat/offlineSyncService.ts',
  'src/main/task/taskSyncService.ts',
  'src/main/task/taskOfflineSyncService.ts',
  'src/main/task/taskCrdtService.ts',
  'src/main/task/taskCrdtOfflineSyncService.ts',
  'src/main/task/taskAwarenessService.ts',
  'src/main/task/groupTagSyncService.ts',
  'src/main/task/groupTagOfflineSyncService.ts',
  'src/main/whiteboard/whiteboardCrdtService.ts',
  'src/main/whiteboard/whiteboardCrdtOfflineSyncService.ts',
  'src/main/whiteboard/whiteboardAwarenessService.ts',
  'src/main/whiteboard/whiteboardSyncService.ts',
  'src/main/mindmap/mindmapCrdtService.ts',
  'src/main/mindmap/mindmapCrdtOfflineSyncService.ts',
  'src/main/mindmap/mindmapAwarenessService.ts',
  'src/main/mindmap/mindmapSyncService.ts',
  'src/main/file/fileSyncService.ts',
  'src/main/file/fileMetaOfflineSyncService.ts',
  'src/main/crypto/groupKeyService.ts',
  'src/main/group/memberEventService.ts',
  'src/main/network/stub/NetworkStub.ts',
  'src/main/network/real/RealNetworkTransport.ts'
]

const unimplementedSrc = readFileSync(
  join(root, 'src/shared/network/unimplementedSync.ts'),
  'utf8'
)
assert.match(unimplementedSrc, /UNIMPLEMENTED_SYNC_TYPES/, 'unimplementedSync.ts required')
assert.match(unimplementedSrc, /assertPublishableSyncType/, 'assertPublishableSyncType required')

const stubPublish = readFileSync(join(root, 'src/main/network/stub/NetworkStub.ts'), 'utf8')
const realPublish = readFileSync(
  join(root, 'src/main/network/real/RealNetworkTransport.ts'),
  'utf8'
)
assert.match(stubPublish, /assertPublishableSyncType/, 'NetworkStub.publish must guard')
assert.match(realPublish, /assertPublishableSyncType/, 'RealNetworkTransport.publish must guard')

for (const type of UNIMPLEMENTED_PUBLISH) {
  assert.ok(
    unimplementedSrc.includes(`'${type}'`),
    `UNIMPLEMENTED_SYNC_TYPES must include ${type}`
  )
}

assert.ok(
  !/UNIMPLEMENTED_SYNC_TYPES\s*=\s*\[[^\]]*['"]task_crdt['"]/.test(unimplementedSrc),
  'task_crdt must not remain in UNIMPLEMENTED_SYNC_TYPES (TASK-157)'
)

const taskCrdtSrc = readFileSync(join(root, 'src/shared/task/taskCrdt.ts'), 'utf8')
assert.match(taskCrdtSrc, /TaskCrdtPayload/, 'TaskCrdtPayload required')
assert.match(taskCrdtSrc, /isTaskCrdtPayload/, 'isTaskCrdtPayload required')
assert.match(taskCrdtSrc, /task:\{groupId\}|task:\$\{groupId\}/, 'docId convention required')

const taskAwarenessSrc = readFileSync(join(root, 'src/shared/task/taskAwareness.ts'), 'utf8')
assert.match(taskAwarenessSrc, /TaskAwarenessPayload/, 'TaskAwarenessPayload required')
assert.match(taskAwarenessSrc, /isTaskAwarenessPayload/, 'isTaskAwarenessPayload required')
assert.match(taskAwarenessSrc, /TaskAwarenessLocalState/, 'TaskAwarenessLocalState required')

const groupTagSrc = readFileSync(join(root, 'src/shared/task/groupTagMeta.ts'), 'utf8')
assert.match(groupTagSrc, /GroupTagPatchPayload/, 'GroupTagPatchPayload required')
assert.match(groupTagSrc, /isGroupTagPatchPayload/, 'isGroupTagPatchPayload required')
assert.match(groupTagSrc, /GroupTagSyncRequestPayload/, 'GroupTagSyncRequestPayload required')
assert.match(groupTagSrc, /isGroupTagSyncBatchPayload/, 'isGroupTagSyncBatchPayload required')

const fileSyncSrc = readFileSync(join(root, 'src/shared/file/sync.ts'), 'utf8')
assert.match(fileSyncSrc, /FileMetaSyncRequestPayload/, 'FileMetaSyncRequestPayload required')
assert.match(fileSyncSrc, /isFileMetaSyncBatchPayload/, 'isFileMetaSyncBatchPayload required')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
}
assert.ok(pkg.dependencies?.['y-protocols'], 'y-protocols dependency required (TASK-177)')

const corpus = HANDLER_FILES.map((rel) => readFileSync(join(root, rel), 'utf8')).join('\n')

for (const type of SYNC_TYPES) {
  const pattern = new RegExp(`['"]${type}['"]|type === '${type}'|type !== '${type}'`)
  if (POST_RC_OR_TRANSPORT.has(type)) {
    const inTransport =
      stubPublish.includes(type) ||
      realPublish.includes(type) ||
      readFileSync(join(root, 'src/shared/network/types.ts'), 'utf8').includes(`'${type}'`) ||
      unimplementedSrc.includes(`'${type}'`) ||
      readFileSync(join(root, 'src/shared/group/memberEvent.ts'), 'utf8').includes(type) ||
      taskCrdtSrc.includes(type) ||
      taskCrdtSrc.includes('task_crdt')
    assert.ok(inTransport, `transport/doc reference missing for ${type}`)
    continue
  }
  assert.ok(pattern.test(corpus), `no handler reference for sync type: ${type}`)
}

console.log(`verify:sync-handlers OK (${SYNC_TYPES.length} types checked)`)
