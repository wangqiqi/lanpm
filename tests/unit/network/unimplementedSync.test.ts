import { describe, expect, it } from 'vitest'
import {
  assertPublishableSyncType,
  isUnimplementedSyncType,
  UNIMPLEMENTED_SYNC_TYPES
} from '../../../src/shared/network/unimplementedSync.ts'

describe('unimplementedSync', () => {
  it('lists task_crdt and member_event', () => {
    expect(UNIMPLEMENTED_SYNC_TYPES).toContain('task_crdt')
    expect(UNIMPLEMENTED_SYNC_TYPES).toContain('member_event')
  })

  it('detects unimplemented types', () => {
    expect(isUnimplementedSyncType('task_crdt')).toBe(true)
    expect(isUnimplementedSyncType('member_event')).toBe(true)
    expect(isUnimplementedSyncType('task_patch')).toBe(false)
    expect(isUnimplementedSyncType('chat')).toBe(false)
  })

  it('assertPublishableSyncType throws for unimplemented', () => {
    expect(() => assertPublishableSyncType('task_crdt')).toThrow('err.syncTypeUnimplemented')
    expect(() => assertPublishableSyncType('member_event')).toThrow('err.syncTypeUnimplemented')
    expect(() => assertPublishableSyncType('task_patch')).not.toThrow()
  })
})
