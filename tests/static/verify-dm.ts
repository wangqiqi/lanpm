/**
 * M2-04 DM session smoke (no SQLite).
 * Run: npm run verify:dm
 */
import {
  buildDmGroupId,
  getDmPeerUserId,
  isDmGroupId,
  parseDmGroupId
} from '../../src/shared/chat/dmSession.ts'

const alice = 'user-alice'
const bob = 'user-bob'

const dmFromAlice = buildDmGroupId(alice, bob)
const dmFromBob = buildDmGroupId(bob, alice)
if (dmFromAlice !== dmFromBob) {
  throw new Error(`buildDmGroupId not deterministic: ${dmFromAlice} vs ${dmFromBob}`)
}
if (!isDmGroupId(dmFromAlice)) {
  throw new Error('isDmGroupId failed')
}

const pair = parseDmGroupId(dmFromAlice)
if (!pair || pair[0] !== alice || pair[1] !== bob) {
  throw new Error(`parseDmGroupId failed: ${pair?.join(',')}`)
}

const peer = getDmPeerUserId(dmFromAlice, alice)
if (peer !== bob) {
  throw new Error(`getDmPeerUserId failed: ${peer}`)
}

try {
  buildDmGroupId(alice, alice)
  throw new Error('expected self-dm error')
} catch (e) {
  if (!(e instanceof Error) || e.message !== 'err.dmSelf') {
    throw e
  }
}

console.log('OK: buildDmGroupId + parseDmGroupId + getDmPeerUserId')
