/**
 * M2-05 presence aggregation smoke (no SQLite).
 * Run: npm run verify:presence
 */
import {
  aggregateUserPresence,
  aggregateUserPresenceFromDevices
} from '../../src/shared/presence/aggregate.ts'
import { presenceEmoji, presenceLabel } from '../../src/shared/presence/display.ts'

if (aggregateUserPresence(['offline', 'away']) !== 'away') {
  throw new Error('away should beat offline')
}
if (aggregateUserPresence(['away', 'online']) !== 'online') {
  throw new Error('online should beat away')
}
if (aggregateUserPresence([]) !== 'offline') {
  throw new Error('empty should be offline')
}

const now = Date.now()
const ttl = 15_000
const userId = 'user-a'
const aggregated = aggregateUserPresenceFromDevices(
  [
    { userId, deviceId: 'd1', presence: 'away', updatedAt: now - 1_000 },
    { userId, deviceId: 'd2', presence: 'online', updatedAt: now - 500 }
  ],
  userId,
  now,
  ttl
)
if (aggregated !== 'online') {
  throw new Error(`multi-device aggregate failed: ${aggregated}`)
}

const stale = aggregateUserPresenceFromDevices(
  [{ userId, deviceId: 'd1', presence: 'online', updatedAt: now - ttl - 1 }],
  userId,
  now,
  ttl
)
if (stale !== 'offline') {
  throw new Error('stale device should be offline')
}

if (presenceEmoji('online') !== '🟢' || presenceLabel('away') !== '离开') {
  throw new Error('display helpers failed')
}

console.log('OK: aggregateUserPresence + presence display')
