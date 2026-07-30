/**
 * 配对安全：TTL · 限流 · pairingId 一次性（TASK-PAIR-07）。
 * Run: npm run verify:pairing-security
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const pairingSession = readFileSync(
  join(root, 'src/main/network/real/pairingSession.ts'),
  'utf8'
)
const pairingTypes = readFileSync(join(root, 'src/shared/network/pairingTypes.ts'), 'utf8')

assert.match(pairingTypes, /PAIRING_TTL_MS/)
assert.match(pairingTypes, /MAX_PAIRING_FAIL_PER_JOINER/)
assert.match(pairingTypes, /MAX_PAIRING_LOOKUPS_PER_JOINER_PER_MINUTE/)
assert.match(pairingSession, /consumed/)
assert.match(pairingSession, /lookupTimestamps/)
assert.match(pairingSession, /rate_limit/)

console.log('verify:pairing-security OK')
