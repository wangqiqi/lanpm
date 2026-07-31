/**
 * TASK-852 — media_signal room registry + inbox round-trip (shared layer).
 * Run: npm run verify:media-signal
 */
import assert from 'node:assert/strict'
import type { MediaSignalPayload } from '../../src/shared/media/mediaSignal.ts'
import { MediaSignalRoomRegistry } from '../../src/shared/media/mediaSignalRoom.ts'

const GROUP = 'grp_media_signal_demo'

const registry = new MediaSignalRoomRegistry()

registry.joinRoom(GROUP, 'user_mesh_a', 'Alice')
registry.joinRoom(GROUP, 'user_mesh_b', 'Bob')
assert.equal(registry.getRoomState(GROUP).participants.length, 2)

const offerPayload: MediaSignalPayload = {
  signalId: 'sig_offer_1',
  groupId: GROUP,
  kind: 'offer',
  fromUserId: 'user_mesh_a',
  fromDisplayName: 'Alice',
  toUserId: 'user_mesh_b',
  sdp: 'v=0\r\n',
  at: new Date().toISOString()
}
registry.ingestRemoteSignal('user_mesh_b', offerPayload)

const polled = registry.pollInbox(GROUP, 'user_mesh_b', '')
assert.ok(polled.messages.some((m) => m.kind === 'offer' && m.sdp === 'v=0\r\n'))

registry.joinRoom(GROUP, 'user_mesh_c', 'Carol')
registry.joinRoom(GROUP, 'user_mesh_d', 'Dave')
assert.equal(registry.getRoomState(GROUP).participants.length, 4)

let threw = false
try {
  registry.joinRoom(GROUP, 'user_overflow', 'Overflow')
} catch (err) {
  threw = err instanceof Error && err.message === 'media_room_full'
}
assert.ok(threw, '5th join must fail with media_room_full')

console.log('verify:media-signal OK')
