import { describe, expect, it } from 'vitest'
import {
  assertPublishableSyncType,
  isUnimplementedSyncType,
  UNIMPLEMENTED_SYNC_TYPES
} from '../../../src/shared/network/unimplementedSync.ts'

describe('unimplementedSync', () => {
  it('is empty after TASK-157 (task_crdt publishable)', () => {
    expect(UNIMPLEMENTED_SYNC_TYPES).toHaveLength(0)
    expect(UNIMPLEMENTED_SYNC_TYPES).not.toContain('task_crdt')
    expect(UNIMPLEMENTED_SYNC_TYPES).not.toContain('member_event')
  })

  it('detects no unimplemented types', () => {
    expect(isUnimplementedSyncType('task_crdt')).toBe(false)
    expect(isUnimplementedSyncType('member_event')).toBe(false)
    expect(isUnimplementedSyncType('task_patch')).toBe(false)
    expect(isUnimplementedSyncType('chat')).toBe(false)
  })

  it('assertPublishableSyncType allows task_crdt', () => {
    expect(() => assertPublishableSyncType('task_crdt')).not.toThrow()
    expect(() => assertPublishableSyncType('member_event')).not.toThrow()
    expect(() => assertPublishableSyncType('task_patch')).not.toThrow()
  })
})
