import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { parseOpsCommand } from '../../../src/shared/chat/opsCommand.ts'

describe('parseOpsCommand', () => {
  it('parses slash help', () => {
    assert.deepEqual(parseOpsCommand('/help'), { command: 'help', args: [] })
  })

  it('parses slash logs with args', () => {
    assert.deepEqual(parseOpsCommand('/logs app'), { command: 'logs', args: ['app'] })
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
