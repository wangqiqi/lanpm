import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import {
  summarizeOpsCommandLine,
  summarizeOpsResult
} from '../../../src/shared/ops/auditTypes.ts'

describe('ops audit summaries', () => {
  it('summarizes tail with basename only', () => {
    assert.equal(
      summarizeOpsCommandLine('tail', ['outbound/logs/app.log']),
      '/tail app.log'
    )
  })

  it('summarizes failed result', () => {
    assert.equal(summarizeOpsResult({ ok: false, error: 'PATH_FORBIDDEN' }), 'failed: PATH_FORBIDDEN')
  })

  it('summarizes file result', () => {
    assert.equal(summarizeOpsResult({ ok: true, fileName: 'app.log' }), 'file: app.log')
  })

  it('truncates long text result', () => {
    const text = 'x'.repeat(150)
    const summary = summarizeOpsResult({ ok: true, text })
    assert.equal(summary.length, 120)
    assert.match(summary, /\.\.\.$/)
  })
})
