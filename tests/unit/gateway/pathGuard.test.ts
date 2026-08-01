import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { resolveSafePath, PathForbiddenError } from '../../../src/main/gateway/pathGuard.ts'
import path from 'node:path'

describe('gateway pathGuard', () => {
  const root = path.resolve('/tmp/lanpm-gateway-test')

  it('allows nested paths', () => {
    assert.equal(resolveSafePath(root, 'inbound/a.bin'), path.join(root, 'inbound/a.bin'))
  })

  it('rejects traversal', () => {
    assert.throws(() => resolveSafePath(root, '../etc/passwd'), PathForbiddenError)
  })
})
