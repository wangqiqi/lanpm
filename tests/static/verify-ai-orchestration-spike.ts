/**
 * SPRINT-AI-05 — L3 orchestration SPIKE guards (docs + no framework deps).
 * Run: npm run verify:ai-orchestration-spike
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const aiDoc = readFileSync(join(root, 'docs/AI接入.md'), 'utf8')
const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

assert.ok(pkg.scripts?.['verify:ai-orchestration-spike'], 'missing verify:ai-orchestration-spike script')

assert.match(aiDoc, /### 6\.3 L3 编排调研结论/)
assert.match(aiDoc, /SPRINT-AI-05/)
assert.match(aiDoc, /verify:ai-orchestration-spike/)
assert.match(aiDoc, /自建轻量状态机/)

assert.match(roadmap, /verify:ai-orchestration-spike/)
assert.match(roadmap, /SPIKE-AI-05|L3 多步编排/)

const deps = { ...pkg.dependencies, ...pkg.devDependencies }
const forbidden = [/langgraph/i, /@langchain\//, /open-multi-agent/i]
for (const name of Object.keys(deps ?? {})) {
  for (const re of forbidden) {
    assert.ok(!re.test(name), `orchestration framework must not be core dep: ${name}`)
  }
}

console.log('verify:ai-orchestration-spike OK (docs · no orchestration framework deps)')
