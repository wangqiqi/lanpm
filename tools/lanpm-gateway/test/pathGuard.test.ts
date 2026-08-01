import assert from 'node:assert/strict'
import path from 'node:path'
import { test } from 'node:test'
import { PathForbiddenError, resolveSafePath } from '../src/pathGuard.ts'

const root = path.resolve('/tmp/lanpm-gateway-root')

test('resolveSafePath allows nested file', () => {
  const full = resolveSafePath(root, 'inbound/pkg.tar.gz')
  assert.equal(full, path.join(root, 'inbound/pkg.tar.gz'))
})

test('resolveSafePath rejects parent traversal', () => {
  assert.throws(() => resolveSafePath(root, '../etc/passwd'), PathForbiddenError)
  assert.throws(() => resolveSafePath(root, 'foo/../../outside'), PathForbiddenError)
})
