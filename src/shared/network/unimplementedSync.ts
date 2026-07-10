import type { SyncMessageType } from './types.ts'
import { throwLanpm } from '../errors/lanpmError.ts'

/**
 * Protocol types defined in docs/03 · types.ts but with no main handler yet.
 * Transport must refuse to publish these until post-RC implementation.
 * @see docs/06 §2.3
 * `member_event` 已解禁（TASK-146）；handler 见 TASK-147。
 */
export const UNIMPLEMENTED_SYNC_TYPES = ['task_crdt'] as const

export type UnimplementedSyncType = (typeof UNIMPLEMENTED_SYNC_TYPES)[number]

const unimplementedSet = new Set<string>(UNIMPLEMENTED_SYNC_TYPES)

export function isUnimplementedSyncType(type: string): type is UnimplementedSyncType {
  return unimplementedSet.has(type)
}

/** Call at the start of NetworkTransport.publish (stub + real). */
export function assertPublishableSyncType(type: SyncMessageType): void {
  if (isUnimplementedSyncType(type)) {
    throwLanpm('err.syncTypeUnimplemented')
  }
}
