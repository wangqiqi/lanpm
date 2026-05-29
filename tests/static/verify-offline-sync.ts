import assert from 'node:assert/strict'
import { offlineSyncCutoffIso, OFFLINE_SYNC_TTL_DAYS } from '../../src/shared/chat/offlineSync.ts'

function chunkDelayMs(chunkBytes: number, rateKbps: number, baseMs = 20): number {
  if (rateKbps <= 0) return baseMs
  const bytesPerSec = (rateKbps * 1024) / 8
  if (bytesPerSec <= 0) return baseMs
  return Math.max(baseMs, Math.ceil((chunkBytes / bytesPerSec) * 1000))
}

const cutoff = offlineSyncCutoffIso(OFFLINE_SYNC_TTL_DAYS)
assert.ok(cutoff < new Date().toISOString())

const unlimited = chunkDelayMs(256 * 1024, 0)
const limited = chunkDelayMs(256 * 1024, 512)
assert.ok(limited >= unlimited, 'rate limit should slow transfers')

console.log('verify:offline-sync OK')
