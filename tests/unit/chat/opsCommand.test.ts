import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import {
  isOpsCommandDraft,
  listOpsCommandSuggestions,
  parseOpsCommand,
  suggestOpsSlashCompletion
} from '../../../src/shared/chat/opsCommand.ts'

describe('parseOpsCommand', () => {
  it('parses slash help', () => {
    assert.deepEqual(parseOpsCommand('/help'), { command: 'help', args: [] })
  })

  it('parses slash logs with args', () => {
    assert.deepEqual(parseOpsCommand('/logs app'), { command: 'logs', args: ['app'] })
  })

  it('parses slash tail with path', () => {
    assert.deepEqual(parseOpsCommand('/tail app'), { command: 'tail', args: ['app'] })
  })

  it('parses @machine prefix', () => {
    assert.deepEqual(parseOpsCommand('@prod-web-01 /status'), {
      command: 'status',
      args: [],
      targetDisplayName: 'prod-web-01'
    })
  })

  it('returns null for unknown command', () => {
    assert.equal(parseOpsCommand('/unknown'), null)
  })
})

describe('ops command composer helpers', () => {
  it('detects ops command drafts', () => {
    assert.equal(isOpsCommandDraft('/help'), true)
    assert.equal(isOpsCommandDraft('@prod /logs'), true)
    assert.equal(isOpsCommandDraft('hello'), false)
  })

  it('suggests slash completion for partial commands', () => {
    assert.equal(suggestOpsSlashCompletion('/hel'), '/help')
    assert.equal(suggestOpsSlashCompletion('/help'), null)
    assert.equal(suggestOpsSlashCompletion('  /sta'), '/status')
  })

  it('lists command suggestions', () => {
    const all = listOpsCommandSuggestions()
    assert.ok(all.includes('/help'))
    assert.ok(all.includes('/deploy'))
    const partial = listOpsCommandSuggestions('log')
    assert.deepEqual(partial, ['/logs'])
  })
})
