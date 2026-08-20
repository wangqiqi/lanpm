import type { Database } from 'better-sqlite3'
import type { SyncEnvelope } from '../../shared/network/types'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { getNetworkTransport } from '../network'
import { catchSyncFailure } from '../utils/reportSyncFailure'
import {
  clearMindmapAwarenessWiring,
  ensureMindmapAwarenessWired,
  handleIncomingMindmapAwareness
} from './mindmapAwarenessService'
import {
  clearMindmapCrdtWiring,
  ensureMindmapCrdtWired,
  handleIncomingMindmapCrdt
} from './mindmapCrdtService'
import {
  handleMindmapCrdtSyncBatch,
  handleMindmapCrdtSyncRequest,
  wireMindmapCrdtOfflineSync
} from './mindmapCrdtOfflineSyncService'
import { listMindmapDocuments } from '../storage/repositories/mindmapRepository'

const subscribedGroups = new Map<string, () => void>()

function handleIncoming(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type === 'mindmap_crdt') {
    handleIncomingMindmapCrdt(db, envelope)
    return
  }
  if (envelope.type === 'mindmap_crdt_sync_request') {
    void handleMindmapCrdtSyncRequest(db, envelope).catch(
      catchSyncFailure('mindmapCrdt.handleSyncRequest', { notify: false })
    )
    return
  }
  if (envelope.type === 'mindmap_crdt_sync_batch') {
    handleMindmapCrdtSyncBatch(db, envelope)
    return
  }
  if (envelope.type === 'mindmap_awareness') {
    handleIncomingMindmapAwareness(db, envelope)
  }
}

function ensureSubscribed(db: Database, groupId: string): void {
  if (subscribedGroups.has(groupId)) return
  const transport = getNetworkTransport()
  if (!transport) return
  if (isAnonymousGroupType(resolveGroupType(db, groupId))) return
  const unsub = transport.subscribe(groupId, (env) => handleIncoming(db, env))
  subscribedGroups.set(groupId, unsub)
  for (const doc of listMindmapDocuments(db, groupId)) {
    ensureMindmapCrdtWired(db, doc.docId)
    ensureMindmapAwarenessWired(db, doc.docId)
  }
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

export function initMindmapSyncService(db: Database): void {
  refreshSubscriptions(db)
  wireMindmapCrdtOfflineSync(db)
}

export function shutdownMindmapSyncService(): void {
  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()
  clearMindmapAwarenessWiring()
  clearMindmapCrdtWiring()
}

export function refreshMindmapSyncSubscriptions(db: Database): void {
  refreshSubscriptions(db)
}
