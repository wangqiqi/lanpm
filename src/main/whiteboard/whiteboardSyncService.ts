/**
 * Subscribe group transport for whiteboard_crdt* + awareness (TASK-260).
 */
import type { Database } from 'better-sqlite3'
import type { SyncEnvelope } from '../../shared/network/types'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import {
  clearWhiteboardAwarenessWiring,
  ensureWhiteboardAwarenessWired,
  handleIncomingWhiteboardAwareness
} from './whiteboardAwarenessService'
import {
  clearWhiteboardCrdtWiring,
  ensureWhiteboardCrdtWired,
  handleIncomingWhiteboardCrdt
} from './whiteboardCrdtService'
import {
  handleWhiteboardCrdtSyncBatch,
  handleWhiteboardCrdtSyncRequest,
  wireWhiteboardCrdtOfflineSync
} from './whiteboardCrdtOfflineSyncService'

const subscribedGroups = new Map<string, () => void>()

function handleIncoming(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type === 'whiteboard_crdt') {
    handleIncomingWhiteboardCrdt(db, envelope)
    return
  }
  if (envelope.type === 'whiteboard_crdt_sync_request') {
    void handleWhiteboardCrdtSyncRequest(db, envelope).catch(
      catchSyncFailure('whiteboardCrdt.handleSyncRequest', { notify: false })
    )
    return
  }
  if (envelope.type === 'whiteboard_crdt_sync_batch') {
    handleWhiteboardCrdtSyncBatch(db, envelope)
    return
  }
  if (envelope.type === 'whiteboard_awareness') {
    handleIncomingWhiteboardAwareness(db, envelope)
  }
}

function ensureSubscribed(db: Database, groupId: string): void {
  if (subscribedGroups.has(groupId)) return
  const transport = getNetworkTransport()
  if (!transport) return
  if (isAnonymousGroupType(resolveGroupType(db, groupId))) return
  const unsub = transport.subscribe(groupId, (env) => handleIncoming(db, env))
  subscribedGroups.set(groupId, unsub)
  ensureWhiteboardCrdtWired(db, groupId)
  ensureWhiteboardAwarenessWired(db, groupId)
}

function refreshSubscriptions(db: Database): void {
  const transport = getNetworkTransport()
  if (!transport) return
  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()
  for (const group of listUserGroups(db)) {
    ensureSubscribed(db, group.groupId)
  }
}

export function initWhiteboardSyncService(db: Database): void {
  refreshSubscriptions(db)
  wireWhiteboardCrdtOfflineSync(db)
}

export function shutdownWhiteboardSyncService(): void {
  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()
  clearWhiteboardAwarenessWiring()
  clearWhiteboardCrdtWiring()
}

/** Call when group membership changes so whiteboard peers stay subscribed. */
export function refreshWhiteboardSyncSubscriptions(db: Database): void {
  refreshSubscriptions(db)
}
