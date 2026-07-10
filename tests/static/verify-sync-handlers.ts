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
  'file_meta',
  'file_pull_request',
  'file_chunk',
  'member_event',
  'group_key_rotate',
  'chat_sync_request',
  'chat_sync_batch',
  'read_receipt_sync_request',
  'read_receipt_sync_batch'
] as const

/** post-RC / transport-level — 允许仅在文档或 transport 出现 */
const POST_RC_OR_TRANSPORT = new Set<string>(['discovery', 'heartbeat', 'task_crdt'])

/** Must be refused by publish (SPRINT-PROTOCOL-DOCS) — task_crdt only after TASK-146 */
const UNIMPLEMENTED_PUBLISH = new Set<string>(['task_crdt'])

const HANDLER_FILES = [
  'src/main/chat/chatService.ts',
  'src/main/chat/readReceiptService.ts',
  'src/main/chat/readReceiptOfflineSyncService.ts',
  'src/main/chat/offlineSyncService.ts',
  'src/main/task/taskSyncService.ts',
  'src/main/task/taskOfflineSyncService.ts',
  'src/main/file/fileSyncService.ts',
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

const corpus = HANDLER_FILES.map((rel) => readFileSync(join(root, rel), 'utf8')).join('\n')

for (const type of SYNC_TYPES) {
  const pattern = new RegExp(`['"]${type}['"]|type === '${type}'|type !== '${type}'`)
  if (POST_RC_OR_TRANSPORT.has(type)) {
    const inTransport =
      stubPublish.includes(type) ||
      realPublish.includes(type) ||
      readFileSync(join(root, 'src/shared/network/types.ts'), 'utf8').includes(`'${type}'`) ||
      unimplementedSrc.includes(`'${type}'`) ||
      readFileSync(join(root, 'src/shared/group/memberEvent.ts'), 'utf8').includes(type)
    assert.ok(inTransport, `transport/doc reference missing for ${type}`)
    continue
  }
  assert.ok(pattern.test(corpus), `no handler reference for sync type: ${type}`)
}

console.log(`verify:sync-handlers OK (${SYNC_TYPES.length} types checked)`)
