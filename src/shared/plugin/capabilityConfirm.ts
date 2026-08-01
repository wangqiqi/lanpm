import type { PluginCapabilityId } from './types.ts'

/** Extension API v0.4 — Host-forced human review before write executes */
export const HUMAN_REVIEW_CAPABILITY_IDS = [
  'task.create',
  'task.patch',
  'board.moveTask',
  'chat.sendText',
  'chat.sendMarkdown',
  'ai.streamChat',
  'file.upload'
] as const satisfies readonly PluginCapabilityId[]

export type HumanReviewCapabilityId = (typeof HUMAN_REVIEW_CAPABILITY_IDS)[number]

const REVIEW_SET = new Set<string>(HUMAN_REVIEW_CAPABILITY_IDS)

export function isHumanReviewCapability(
  capability: string
): capability is HumanReviewCapabilityId {
  return REVIEW_SET.has(capability)
}

export type CapabilityPendingConfirm = {
  status: 'pending_confirm'
  pendingId: string
  capability: HumanReviewCapabilityId
  pluginId: string
}

export function isCapabilityPendingConfirm(value: unknown): value is CapabilityPendingConfirm {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    v.status === 'pending_confirm' &&
    typeof v.pendingId === 'string' &&
    typeof v.pluginId === 'string' &&
    typeof v.capability === 'string' &&
    isHumanReviewCapability(v.capability)
  )
}
