/**
 * TASK-239 — P1-3 acceptance checklist wiring guards.
 * Run: npm run verify:checklist
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { checklistProgressOf } from '../../src/shared/task/checklist.ts'
import { TASK_IPC } from '../../src/shared/task/channels.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.equal(TASK_IPC.listChecklist, 'task:listChecklist')
assert.equal(TASK_IPC.upsertChecklistItem, 'task:upsertChecklistItem')
assert.equal(TASK_IPC.toggleChecklistItem, 'task:toggleChecklistItem')
assert.equal(TASK_IPC.removeChecklistItem, 'task:removeChecklistItem')
assert.equal(
  TASK_IPC.createSubtaskFromChecklistItem,
  'task:createSubtaskFromChecklistItem'
)

const schemaTs = readFileSync(join(root, 'src/main/storage/schema.ts'), 'utf8')
assert.match(schemaTs, /SCHEMA_VERSION\s*=\s*11/)
assert.match(schemaTs, /task_checklists/)
assert.match(schemaTs, /task_checklist_items/)

const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')
assert.match(schemaSql, /CREATE TABLE task_checklists/)
assert.match(schemaSql, /CREATE TABLE task_checklist_items/)
assert.match(schemaSql, /linked_subtask_id/)

const migrateSrc = readFileSync(join(root, 'src/main/storage/migrate.ts'), 'utf8')
assert.match(migrateSrc, /fromVersion:\s*8/)
assert.match(migrateSrc, /task_checklists/)

assert.deepEqual(checklistProgressOf([]), { done: 0, total: 0 })
assert.deepEqual(
  checklistProgressOf([{ done: true }, { done: false }, { done: true }]),
  { done: 2, total: 3 }
)

assert.ok(existsSync(join(root, 'src/shared/task/checklist.ts')))
assert.ok(existsSync(join(root, 'src/main/storage/repositories/checklistRepository.ts')))

const detail = readFileSync(
  join(root, 'src/renderer/src/features/tree/TaskDetailPanel.tsx'),
  'utf8'
)
assert.match(detail, /listChecklist/)
assert.match(detail, /tree\.detailChecklist/)
assert.match(detail, /createSubtaskFromChecklistItem/)
assert.match(detail, /handleToggleChecklistItem/)

const svc = readFileSync(join(root, 'src/main/task/taskService.ts'), 'utf8')
assert.match(svc, /createSubtaskFromChecklistItem/)
assert.match(svc, /listTaskChecklist/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:checklist'], 'missing verify:checklist script')

console.log('verify:checklist OK (schema v9 · IPC · UI · progress · subtask)')
