export interface MeetingSchedule {
  id: string
  groupId: string
  title: string
  /** ISO 8601 */
  startsAt: string
  durationMinutes: number
  /** ISO 8601 */
  createdAt: string
}

export interface CreateMeetingScheduleInput {
  groupId: string
  title: string
  startsAt: string
  durationMinutes?: number
}

const TITLE_MAX = 120
const DURATION_MIN = 15
const DURATION_MAX = 240
const DURATION_DEFAULT = 30

function newScheduleId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function parseStartsAt(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const ms = Date.parse(value)
  if (Number.isNaN(ms)) return null
  return new Date(ms).toISOString()
}

function clampDuration(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DURATION_DEFAULT
  return Math.min(DURATION_MAX, Math.max(DURATION_MIN, Math.round(n)))
}

export function normalizeMeetingSchedule(raw: unknown): MeetingSchedule | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : null
  const groupId = typeof o.groupId === 'string' && o.groupId.trim() ? o.groupId.trim() : null
  const title =
    typeof o.title === 'string' && o.title.trim()
      ? o.title.trim().slice(0, TITLE_MAX)
      : null
  const startsAt = parseStartsAt(o.startsAt)
  const createdAt = parseStartsAt(o.createdAt) ?? startsAt
  if (!id || !groupId || !title || !startsAt || !createdAt) return null
  return {
    id,
    groupId,
    title,
    startsAt,
    durationMinutes: clampDuration(o.durationMinutes),
    createdAt
  }
}

export function validateCreateMeetingScheduleInput(
  input: unknown
): CreateMeetingScheduleInput | null {
  if (!input || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  const groupId = typeof o.groupId === 'string' && o.groupId.trim() ? o.groupId.trim() : null
  const title =
    typeof o.title === 'string' && o.title.trim()
      ? o.title.trim().slice(0, TITLE_MAX)
      : null
  const startsAt = parseStartsAt(o.startsAt)
  if (!groupId || !title || !startsAt) return null
  return {
    groupId,
    title,
    startsAt,
    durationMinutes: clampDuration(o.durationMinutes ?? DURATION_DEFAULT)
  }
}

export function createMeetingScheduleRecord(
  input: CreateMeetingScheduleInput
): MeetingSchedule {
  const now = new Date().toISOString()
  return {
    id: newScheduleId(),
    groupId: input.groupId,
    title: input.title.trim().slice(0, TITLE_MAX),
    startsAt: input.startsAt,
    durationMinutes: clampDuration(input.durationMinutes),
    createdAt: now
  }
}

export function sortSchedulesByStart(schedules: MeetingSchedule[]): MeetingSchedule[] {
  return [...schedules].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)
  )
}

export function filterUpcomingSchedules(
  schedules: MeetingSchedule[],
  nowMs: number = Date.now()
): MeetingSchedule[] {
  return sortSchedulesByStart(schedules).filter((s) => Date.parse(s.startsAt) >= nowMs - 60_000)
}
