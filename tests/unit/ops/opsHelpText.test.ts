import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { formatGroupOpsHelp } from '../../../src/main/ops/opsHelpText.ts'

describe('formatGroupOpsHelp', () => {
  it('lists commands and machines', () => {
    const text = formatGroupOpsHelp([
      { displayName: 'prod-web-01', deviceId: 'dev_a', online: true },
      { displayName: 'staging', deviceId: 'dev_b', online: false }
    ])
    assert.match(text, /\/logs/)
    assert.match(text, /\/disk/)
    assert.match(text, /prod-web-01/)
    assert.match(text, /staging/)
    assert.match(text, /online/)
    assert.match(text, /offline/)
    assert.match(text, /@prod-web-01/)
  })

  it('handles empty machine list', () => {
    const text = formatGroupOpsHelp([])
    assert.match(text, /no machines registered/i)
  })
})
