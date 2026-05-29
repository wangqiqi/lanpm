/**
 * M5 group guards + cockpit types smoke.
 * Run: npm run verify:m5
 */
import assert from 'node:assert/strict'
import {
  assertGroupAllowsFiles,
  assertGroupAllowsTasks,
  isAnonymousGroupType
} from '../../src/shared/group/guards.ts'
import type { GroupRecord } from '../../src/shared/group/types.ts'

assert.equal(isAnonymousGroupType('anonymous'), true)
assert.equal(isAnonymousGroupType('project'), false)

assert.throws(() => assertGroupAllowsTasks('anonymous'), /stub\.anonymousNoTask/)
assert.throws(() => assertGroupAllowsTasks('function'), /stub\.functionNoTask/)
assert.doesNotThrow(() => assertGroupAllowsTasks('project'))

assert.throws(() => assertGroupAllowsFiles('anonymous'), /err\.anonymousNoFile/)
assert.doesNotThrow(() => assertGroupAllowsFiles('project'))
assert.doesNotThrow(() => assertGroupAllowsFiles('project', 'dm:u1__u2'))

const sampleGroup: GroupRecord = {
  groupId: 'g1',
  type: 'project',
  name: 'Demo',
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
  autoDiscover: true
}
assert.equal(sampleGroup.type, 'project')

console.log('verify-m5: ok')
