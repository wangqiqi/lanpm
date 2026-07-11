/**
 * TASK-200 — text caret Awareness wiring (protocol · store · UI).
 * Run: npm run verify:text-caret
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  isTaskAwarenessCaret,
  isTaskAwarenessLocalState
} from '../../src/shared/task/taskAwareness.ts'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.ok(
  isTaskAwarenessCaret({ field: 'description', offset: 0 })
)
assert.equal(isTaskAwarenessCaret({ field: 'title', offset: 0 }), false)

const withCaret = {
  userId: 'u1',
  displayName: 'A',
  focusedTaskId: 't1',
  view: 'board' as const,
  caret: { field: 'description' as const, offset: 3 }
}
assert.ok(isTaskAwarenessLocalState(withCaret))

const protocol = readFileSync(join(projectRoot, 'src/shared/task/taskAwareness.ts'), 'utf8')
assert.match(protocol, /TaskAwarenessCaret/)
assert.match(protocol, /field: TaskAwarenessCaretField/)

const store = readFileSync(
  join(projectRoot, 'src/renderer/src/stores/taskAwarenessStore.ts'),
  'utf8'
)
assert.match(store, /descriptionCarets/)

const overlay = readFileSync(
  join(projectRoot, 'src/renderer/src/features/task/RemoteCaretOverlay.tsx'),
  'utf8'
)
assert.match(overlay, /RemoteCaretOverlay/)
assert.match(overlay, /caretLabel/)

const detail = readFileSync(
  join(projectRoot, 'src/renderer/src/features/tree/TaskDetailPanel.tsx'),
  'utf8'
)
assert.match(detail, /RemoteCaretOverlay/)
assert.match(detail, /useDescriptionCaretBroadcast/)

const modal = readFileSync(
  join(projectRoot, 'src/renderer/src/features/board/TaskEditModal.tsx'),
  'utf8'
)
assert.match(modal, /RemoteCaretOverlay/)
assert.match(modal, /publishCaret/)

const docs03 = readFileSync(
  join(projectRoot, 'docs/03_数据模型与协议草案.md'),
  'utf8'
)
assert.match(docs03, /caret\?:/)

console.log('verify:text-caret OK (protocol · store · overlay · Detail/EditModal)')
