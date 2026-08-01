/**
 * ops-p2 — Phase 2 sprint guards (extends verify:ops-agent).
 * Run: npm run verify:ops-p2
 */
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:ops-p2'], 'missing verify:ops-p2 script')
assert.ok(pkg.scripts?.['verify:ops-agent'], 'missing verify:ops-agent script')

execSync('npm run verify:ops-agent', { cwd: root, stdio: 'inherit' })
execSync('npm run verify:plugin-enable-ui', { cwd: root, stdio: 'inherit' })

const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
const featureDoc = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')

assert.match(roadmap, /verify:ops-p2/)
assert.match(featureDoc, /verify:ops-p2/)

assert.ok(existsSync(join(root, 'src/renderer/src/features/ops/OpsProfilePanel.tsx')))
assert.ok(existsSync(join(root, 'src/shared/chat/taskRefs.ts')))

const taskRefs = readFileSync(join(root, 'src/shared/chat/taskRefs.ts'), 'utf8')
assert.match(taskRefs, /resolveComposerTaskLink/)

const analyze = readFileSync(
  join(root, 'src/renderer/src/features/chat/analyzeInAssistant.ts'),
  'utf8'
)
assert.match(analyze, /logDesensitize/)

console.log('verify:ops-p2 OK')
