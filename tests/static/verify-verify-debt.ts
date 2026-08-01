/**
 * verify-debt Sprint 静态门禁。
 * Run: npm run verify:verify-debt-static
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>
}

assert.equal(typeof pkg.scripts['verify:verify-debt'], 'string')
assert.equal(typeof pkg.scripts['verify:verify-debt-static'], 'string')

const runner = join(root, 'tests/runners/verify-verify-debt.ts')
assert.ok(existsSync(runner))

const crdtModel = readFileSync(join(root, 'src/shared/task/taskCrdtModel.ts'), 'utf8')
assert.match(crdtModel, /from '\.\/tags\.ts'/, 'taskCrdtModel must import tags.ts')

const checklist = readFileSync(join(root, 'tests/static/verify-checklist.ts'), 'utf8')
assert.match(checklist, /EXPECTED_TABLES/, 'checklist uses EXPECTED_TABLES')
assert.doesNotMatch(checklist, /SCHEMA_VERSION\\s\*=\\s\*11/)

const docs05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
assert.match(docs05, /verify:verify-debt/, 'docs/05 documents verify:verify-debt')

console.log('verify:verify-debt-static OK')
