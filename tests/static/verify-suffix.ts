/**
 * M0-07 suffix / uniqueness rules (local + mocked LAN).
 * Run: npm run verify:suffix
 */
import {
  allocateUserId,
  formatSuffix,
  validateManualUserId
} from '../../src/shared/identity/idGen.ts'

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg)
}

// 1) unique base -> no suffix
const r1 = allocateUserId('Alice', () => false)
assert(r1.userId === 'alice', `expected alice, got ${r1.userId}`)
assert(!r1.suffix, 'no suffix when unique')

// 2) local conflict -> -yymm
const fixedDate = new Date('2024-01-15T00:00:00Z')
const taken = new Set(['bob'])
const r2 = allocateUserId('Bob', (id) => taken.has(id), fixedDate)
assert(r2.userId === 'bob-2401', `expected bob-2401, got ${r2.userId}`)
assert(r2.suffix === '-2401', 'suffix month')

// 3) LAN conflict on suffixed id -> -n
taken.add('bob-2401')
const r3 = allocateUserId('Bob', (id) => taken.has(id), fixedDate)
assert(r3.userId === 'bob-2401-2', `expected bob-2401-2, got ${r3.userId}`)

// 4) manual validation
assert(validateManualUserId('valid-id', () => false).ok, 'valid id')
assert(!validateManualUserId('valid-id', () => true).ok, 'reject taken')
assert(!validateManualUserId('X', () => false).ok, 'reject invalid format')

assert(formatSuffix(fixedDate) === '-2401', 'formatSuffix')

console.log('OK: suffix rules (allocate + manual validate + LAN mock)')
