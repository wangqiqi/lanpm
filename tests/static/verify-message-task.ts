/**
 * TASK-234 — A2 message ↔ task wiring guards.
 * Run: npm run verify:message-task
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { collectTaskDiscussions } from '../../src/shared/task/discussions.ts'
import { TASK_IPC } from '../../src/shared/task/channels.ts'
import type { ChatMessage } from '../../src/shared/chat/types.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(TASK_IPC.listDiscussions === 'task:listDiscussions')

const schemaTs = readFileSync(join(projectRoot, 'src/main/storage/schema.ts'), 'utf8')
assert.match(schemaTs, /SCHEMA_VERSION\s*=\s*8/)

const schemaSql = readFileSync(join(projectRoot, 'src/main/storage/schema.sql'), 'utf8')
assert.match(schemaSql, /source_msg_id/)
assert.match(schemaSql, /linked_file_ids_json/)

const migrateSrc = readFileSync(join(projectRoot, 'src/main/storage/migrate.ts'), 'utf8')
assert.match(migrateSrc, /fromVersion:\s*7/)
assert.match(migrateSrc, /source_msg_id/)

const textMsg: ChatMessage = {
  msgId: 'm1',
  groupId: 'g1',
  senderUserId: 'u1',
  senderDeviceId: 'd1',
  type: 'text',
  content: { kind: 'text', text: 'Ship A2' },
  lamportTs: 1,
  createdAt: '2026-07-11T00:00:00Z',
  deliveryStatus: 'sent'
}
const refMsg: ChatMessage = {
  ...textMsg,
  msgId: 'm3',
  type: 'task_ref',
  content: { kind: 'task_ref', taskId: 't1', title: 'Ship A2' },
  lamportTs: 3
}
const discussions = collectTaskDiscussions([textMsg, refMsg], 't1', 'm1')
assert.equal(discussions.length, 2)
assert.equal(discussions[0]!.kind, 'source')
assert.equal(discussions[1]!.kind, 'task_ref')

const bubble = readFileSync(
  join(projectRoot, 'src/renderer/src/features/chat/MessageBubble.tsx'),
  'utf8'
)
assert.match(bubble, /createTaskFromMessage/)
assert.match(bubble, /linkFileToTask/)

const detail = readFileSync(
  join(projectRoot, 'src/renderer/src/features/tree/TaskDetailPanel.tsx'),
  'utf8'
)
assert.match(detail, /listDiscussions/)
assert.match(detail, /detailDiscussions/)
assert.match(detail, /linkedFileIds/)

const board = readFileSync(
  join(projectRoot, 'src/renderer/src/features/board/BoardView.tsx'),
  'utf8'
)
assert.match(board, /referenceFromChat/)
assert.match(board, /highlightMsgId/)

assert.ok(existsSync(join(projectRoot, 'src/shared/task/discussions.ts')))
assert.ok(existsSync(join(projectRoot, 'src/shared/task/fromMessage.ts')))
assert.ok(existsSync(join(projectRoot, 'src/shared/task/linkFile.ts')))
assert.ok(existsSync(join(projectRoot, 'src/shared/task/linkedFiles.ts')))

const fromMessage = readFileSync(join(projectRoot, 'src/shared/task/fromMessage.ts'), 'utf8')
assert.match(fromMessage, /titleFromChatMessage/)
assert.match(fromMessage, /linkedFileIdsFromMessage/)

const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:message-task'], 'package.json missing verify:message-task')

const docs01 = readFileSync(join(projectRoot, 'docs/01_产品需求文档.md'), 'utf8')
assert.match(docs01, /消息↔任务|建任务/)

console.log('verify:message-task OK (schema v8 · IPC · UI hooks · discussions)')
