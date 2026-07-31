import { randomUUID } from 'node:crypto'
import type { HumanReviewCapabilityId } from '../../shared/plugin/capabilityConfirm.ts'

export type CapabilityPendingArgs = Record<string, unknown>

export type CapabilityPendingRecord = {
  pendingId: string
  pluginId: string
  capability: HumanReviewCapabilityId
  args: CapabilityPendingArgs
  userId: string
  createdAt: number
}

const store = new Map<string, CapabilityPendingRecord>()
const TTL_MS = 5 * 60 * 1000

function sweep(now = Date.now()): void {
  for (const [id, rec] of store) {
    if (now - rec.createdAt > TTL_MS) store.delete(id)
  }
}

export function createCapabilityPending(input: {
  pluginId: string
  capability: HumanReviewCapabilityId
  args: CapabilityPendingArgs
  userId: string
}): string {
  sweep()
  const pendingId = `pend_${randomUUID()}`
  store.set(pendingId, {
    pendingId,
    pluginId: input.pluginId,
    capability: input.capability,
    args: input.args,
    userId: input.userId,
    createdAt: Date.now()
  })
  return pendingId
}

export function takeCapabilityPending(pendingId: string): CapabilityPendingRecord | null {
  sweep()
  const rec = store.get(pendingId)
  if (!rec) return null
  store.delete(pendingId)
  return rec
}

/** test helper */
export function clearCapabilityPendings(): void {
  store.clear()
}
