/**
 * docs/03 §6.2 — member_event payload。
 * 本 Sprint 出站仅 **dissolve**；join/leave 类型预留，handler 见 TASK-147。
 */
export type MemberEventAction = 'dissolve' | 'join' | 'leave'

export interface MemberEventPayload {
  action: MemberEventAction
  groupId: string
  /** ISO8601 — 事件时间 */
  at: string
  /** 触发者 userId（解散=群主） */
  actorUserId: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const ACTIONS = new Set<MemberEventAction>(['dissolve', 'join', 'leave'])

export function isMemberEventPayload(value: unknown): value is MemberEventPayload {
  if (!isRecord(value)) return false
  if (typeof value.action !== 'string' || !ACTIONS.has(value.action as MemberEventAction)) {
    return false
  }
  if (typeof value.groupId !== 'string' || !value.groupId) return false
  if (typeof value.at !== 'string' || !value.at) return false
  if (typeof value.actorUserId !== 'string' || !value.actorUserId) return false
  return true
}
