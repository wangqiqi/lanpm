import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import type { GatewayPaths } from '../../../src/shared/ops/paths.ts'
import { PathForbiddenError } from '../../../src/main/gateway/pathGuard.ts'
import { resolveTailRel } from '../../../src/main/ops/readOnlyCommands.ts'

const paths: GatewayPaths = {
  root: '/data/agent',
  inboundDir: 'inbound',
  outboundPaths: { app: 'outbound/logs/app.log', nginx: 'outbound/logs/nginx.log' },
  maxBytes: 1024 * 1024
}

describe('resolveTailRel', () => {
  it('resolves outbound key alias', () => {
    assert.equal(resolveTailRel(paths, 'app'), 'outbound/logs/app.log')
  })

  it('allows inbound paths', () => {
    assert.equal(resolveTailRel(paths, 'inbound/pkg.tar.gz'), 'inbound/pkg.tar.gz')
  })

  it('allows paths under outbound log dir', () => {
    assert.equal(resolveTailRel(paths, 'outbound/logs/nginx.log'), 'outbound/logs/nginx.log')
  })

  it('rejects traversal outside whitelist', () => {
    assert.throws(() => resolveTailRel(paths, '../../../etc/passwd'), PathForbiddenError)
    assert.throws(() => resolveTailRel(paths, '/etc/passwd'), PathForbiddenError)
  })

  it('requires path argument', () => {
    assert.throws(() => resolveTailRel(paths, ''), PathForbiddenError)
  })
})
