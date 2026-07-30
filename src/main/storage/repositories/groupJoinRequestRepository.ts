import type { Database } from 'better-sqlite3'
import type { JoinRequestRecord, JoinRequestStatus } from '../../../shared/group/joinRequest'

interface JoinRequestRow {
  request_id: string
  group_id: string
  applicant_user_id: string
  applicant_display_name: string
  owner_user_id: string
  status: string
  created_at: string
  decided_at: string | null
  decided_by: string | null
}

function mapRow(row: JoinRequestRow): JoinRequestRecord {
  return {
    requestId: row.request_id,
    groupId: row.group_id,
    applicantUserId: row.applicant_user_id,
    applicantDisplayName: row.applicant_display_name,
    ownerUserId: row.owner_user_id,
    status: row.status as JoinRequestStatus,
    createdAt: row.created_at,
    decidedAt: row.decided_at ?? undefined,
    decidedBy: row.decided_by ?? undefined
  }
}

export function insertJoinRequest(db: Database, record: JoinRequestRecord): void {
  db.prepare(
    `INSERT INTO group_join_requests (
      request_id, group_id, applicant_user_id, applicant_display_name,
      owner_user_id, status, created_at, decided_at, decided_by
    ) VALUES (
      @requestId, @groupId, @applicantUserId, @applicantDisplayName,
      @ownerUserId, @status, @createdAt, @decidedAt, @decidedBy
    )`
  ).run({
    requestId: record.requestId,
    groupId: record.groupId,
    applicantUserId: record.applicantUserId,
    applicantDisplayName: record.applicantDisplayName,
    ownerUserId: record.ownerUserId,
    status: record.status,
    createdAt: record.createdAt,
    decidedAt: record.decidedAt ?? null,
    decidedBy: record.decidedBy ?? null
  })
}

export function getJoinRequest(db: Database, requestId: string): JoinRequestRecord | undefined {
  const row = db
    .prepare(`SELECT * FROM group_join_requests WHERE request_id = ?`)
    .get(requestId) as JoinRequestRow | undefined
  return row ? mapRow(row) : undefined
}

export function updateJoinRequestStatus(
  db: Database,
  requestId: string,
  status: JoinRequestStatus,
  decidedBy: string,
  decidedAt: string
): void {
  db.prepare(
    `UPDATE group_join_requests
     SET status = @status, decided_by = @decidedBy, decided_at = @decidedAt
     WHERE request_id = @requestId`
  ).run({ requestId, status, decidedBy, decidedAt })
}

export function listPendingJoinRequestsForOwner(
  db: Database,
  ownerUserId: string
): JoinRequestRecord[] {
  const rows = db
    .prepare(
      `SELECT * FROM group_join_requests
       WHERE owner_user_id = ? AND status = 'pending'
       ORDER BY created_at ASC`
    )
    .all(ownerUserId) as JoinRequestRow[]
  return rows.map(mapRow)
}

export function hasPendingJoinRequest(
  db: Database,
  groupId: string,
  applicantUserId: string
): boolean {
  return Boolean(getPendingJoinRequestId(db, groupId, applicantUserId))
}

export function getPendingJoinRequestId(
  db: Database,
  groupId: string,
  applicantUserId: string
): string | undefined {
  const row = db
    .prepare(
      `SELECT request_id FROM group_join_requests
       WHERE group_id = ? AND applicant_user_id = ? AND status = 'pending'
       LIMIT 1`
    )
    .get(groupId, applicantUserId) as { request_id: string } | undefined
  return row?.request_id
}

export function listPendingJoinRequestGroupIds(
  db: Database,
  applicantUserId: string
): Set<string> {
  const rows = db
    .prepare(
      `SELECT group_id FROM group_join_requests
       WHERE applicant_user_id = ? AND status = 'pending'`
    )
    .all(applicantUserId) as { group_id: string }[]
  return new Set(rows.map((r) => r.group_id))
}
