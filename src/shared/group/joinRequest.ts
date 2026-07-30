export type JoinRequestStatus = 'pending' | 'approved' | 'rejected'

export interface JoinRequestRecord {
  requestId: string
  groupId: string
  applicantUserId: string
  applicantDisplayName: string
  ownerUserId: string
  status: JoinRequestStatus
  createdAt: string
  decidedAt?: string
  decidedBy?: string
}

export interface JoinRequestPayload {
  requestId: string
  groupId: string
  groupName: string
  ownerUserId: string
  applicantUserId: string
  applicantDisplayName: string
  at: string
}

export interface JoinRequestDecisionPayload {
  requestId: string
  groupId: string
  applicantUserId: string
  approved: boolean
  at: string
  actorUserId: string
}

export type JoinGroupResult =
  | { status: 'joined'; group: import('./types').GroupRecord }
  | { status: 'pending'; requestId: string }
  | { status: 'already_member'; group: import('./types').GroupRecord }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isJoinRequestPayload(value: unknown): value is JoinRequestPayload {
  if (!isRecord(value)) return false
  return (
    typeof value.requestId === 'string' &&
    typeof value.groupId === 'string' &&
    typeof value.groupName === 'string' &&
    typeof value.ownerUserId === 'string' &&
    typeof value.applicantUserId === 'string' &&
    typeof value.applicantDisplayName === 'string' &&
    typeof value.at === 'string'
  )
}

export function isJoinRequestDecisionPayload(value: unknown): value is JoinRequestDecisionPayload {
  if (!isRecord(value)) return false
  return (
    typeof value.requestId === 'string' &&
    typeof value.groupId === 'string' &&
    typeof value.applicantUserId === 'string' &&
    typeof value.approved === 'boolean' &&
    typeof value.at === 'string' &&
    typeof value.actorUserId === 'string'
  )
}
