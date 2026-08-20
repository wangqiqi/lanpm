/**
 * TASK-3103 — taskStore single-row writes must patch locally, not reload the group.
 * Run: npm run verify:task-store-patch
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const src = readFileSync(join(projectRoot, 'src/renderer/src/stores/taskStore.ts'), 'utf8')

function methodSlice(name: string, nextName: string | null): string {
  const startTok = `  ${name}: async`
  const start = src.indexOf(startTok)
  assert.ok(start >= 0, `missing method ${name}`)
  const end = nextName ? src.indexOf(`  ${nextName}: async`, start + 1) : src.length
  assert.ok(end > start, `cannot bound method ${name}`)
  return src.slice(start, end)
}

assert.match(src, /from '@shared\/task\/taskListPatch'/)

const slices: Array<[name: string, next: string | null, allowReload: boolean]> = [
  ['createTask', 'updateTask', false],
  ['updateTask', 'updateSchedule', false],
  ['updateSchedule', 'upsertDependency', false],
  ['upsertDependency', 'moveTask', true],
  ['moveTask', 'deleteTask', false],
  ['deleteTask', 'createFromChat', true],
  ['createFromChat', 'referenceFromChat', false],
  ['referenceFromChat', null, false]
]

for (const [name, next, allowReload] of slices) {
  const body = methodSlice(name, next)
  if (allowReload) {
    assert.match(body, /loadTasks/, `${name} may reload the group`)
  } else {
    assert.doesNotMatch(body, /loadTasks/, `${name} must not call loadTasks`)
    assert.match(body, /upsertTaskInList/, `${name} must patch via upsertTaskInList`)
  }
}

console.log('verify:task-store-patch OK')
