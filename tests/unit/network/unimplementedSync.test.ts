import { describe, expect, it } from 'vitest'
import {
  assertPublishableSyncType,
  isUnimplementedSyncType,
  UNIMPLEMENTED_SYNC_TYPES
} from '../../../src/shared/network/unimplementedSync.ts'

describe('unimplementedSync', () => {
  it('lists task_crdt only (member_event publishable since TASK-146)', () => {
    expect(UNIMPLEMENTED_SYNC_TYPES).toContain('task_crdt')
    expect(UNIMPLEMENTED_SYNC_TYPES).not.toContain('member_event')
  })

  it('detects unimplemented types', () => {
    expect(isUnimplementedSyncType('task_crdt')).toBe(true)
    expect(isUnimplementedSyncType('member_event')).toBe(false)
    expect(isUnimplementedSyncType('task_patch')).toBe(false)
    expect(isUnimplementedSyncType('chat')).toBe(false)
  })

  it('assertPublishableSyncType throws for unimplemented', () => {
    expect(() => assertPublishableSyncType('task_crdt')).toThrow('err.syncTypeUnimplemented')
    expect(() => assertPublishableSyncType('member_event')).not.toThrow()
    expect(() => assertPublishableSyncType('task_patch')).not.toThrow()
  })
})
