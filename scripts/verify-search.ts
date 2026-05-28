/**
 * v1.1 global search helpers smoke.
 * Run: npm run verify:search
 */
import assert from 'node:assert/strict'
import { extractMessageText } from '../src/shared/search/extractMessageText.ts'

assert.equal(extractMessageText({ kind: 'text', text: 'hello world' }), 'hello world')
assert.equal(
  extractMessageText({ kind: 'code', language: 'python', code: 'print(1)' }),
  'print(1)'
)
assert.equal(
  extractMessageText({ kind: 'task_ref', taskId: 't1', title: 'Fix bug' }),
  'Fix bug'
)

console.log('verify-search: ok')
