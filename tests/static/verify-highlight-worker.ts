/**
 * TASK-1174 — highlight-worker guards.
 * Run: npm run verify:highlight-worker
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

for (const f of [
  'docs/specs/016-highlight-worker/spec.md',
  'src/renderer/src/features/chat/highlight.worker.ts',
  'src/renderer/src/features/chat/highlightCore.ts'
]) {
  assert.ok(existsSync(join(root, f)), `missing ${f}`)
}

const spec = readFileSync(join(root, 'docs/specs/016-highlight-worker/spec.md'), 'utf8')
assert.match(spec, /highlight\.worker\.ts/)
assert.match(spec, /highlightCodeAsync/)

const worker = readFileSync(
  join(root, 'src/renderer/src/features/chat/highlight.worker.ts'),
  'utf8'
)
assert.match(worker, /highlightCodeInThread/)
assert.match(worker, /postMessage/)

const setup = readFileSync(join(root, 'src/renderer/src/features/chat/highlightSetup.ts'), 'utf8')
assert.match(setup, /highlightCodeAsync/)
assert.match(setup, /highlight\.worker\.ts/)
assert.match(setup, /inflightByKey/)
assert.ok(!setup.includes('highlightAuto'), 'must not use highlightAuto')

const codeBlock = readFileSync(join(root, 'src/renderer/src/features/chat/CodeBlock.tsx'), 'utf8')
assert.match(codeBlock, /highlightCodeAsync/)
assert.ok(!codeBlock.includes('useMemo'), 'CodeBlock must not sync highlight in useMemo')
assert.match(codeBlock, /AbortController/)

const core = readFileSync(join(root, 'src/renderer/src/features/chat/highlightCore.ts'), 'utf8')
assert.match(core, /HIGHLIGHT_MAX_CHARS/)
assert.match(core, /LruMap/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:highlight-worker'], 'missing verify:highlight-worker script')

console.log('verify:highlight-worker OK')
