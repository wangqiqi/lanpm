import type { Database } from 'better-sqlite3'
import type { SyncEnvelope } from '../../shared/network/types'
import type { SyncOutboxChannel } from '../../shared/sync/outbox'
import { enqueueSyncOutbox } from './outboxStore'

/** Persist a publish attempt for later flush (B4). */
export function enqueueFailedPublish(
  db: Database,
  input: {
    channel: SyncOutboxChannel
    groupId: string
    dedupeKey: string
    envelope: SyncEnvelope
  }
): void {
  enqueueSyncOutbox(db, {
    channel: input.channel,
    groupId: input.groupId,
    dedupeKey: input.dedupeKey,
    envelopeJson: JSON.stringify(input.envelope)
  })
}
