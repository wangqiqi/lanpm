import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'
import {
  createMeetingScheduleRecord,
  filterUpcomingSchedules,
  normalizeMeetingSchedule,
  sortSchedulesByStart,
  validateCreateMeetingScheduleInput,
  validateUpdateMeetingScheduleInput,
  applyMeetingScheduleUpdate,
  type MeetingSchedule
} from '../../shared/media/meetingSchedule.ts'

function storePath(): string {
  return join(app.getPath('userData'), 'meeting-schedules.json')
}

function readAll(): MeetingSchedule[] {
  const path = storePath()
  if (!existsSync(path)) return []
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
    if (!Array.isArray(raw)) return []
    return raw
      .map((item) => normalizeMeetingSchedule(item))
      .filter((item): item is MeetingSchedule => item !== null)
  } catch {
    return []
  }
}

function writeAll(schedules: MeetingSchedule[]): void {
  const path = storePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(sortSchedulesByStart(schedules), null, 2), 'utf8')
}

export function listMeetingSchedules(groupId?: string): MeetingSchedule[] {
  const all = readAll()
  if (!groupId) return sortSchedulesByStart(all)
  return filterUpcomingSchedules(all.filter((s) => s.groupId === groupId))
}

export function listAllMeetingSchedulesForReminders(): MeetingSchedule[] {
  return readAll()
}

export function createMeetingSchedule(input: unknown): MeetingSchedule {
  const validated = validateCreateMeetingScheduleInput(input)
  if (!validated) {
    throw new Error('Invalid meeting schedule input')
  }
  const record = createMeetingScheduleRecord(validated)
  const all = readAll()
  all.push(record)
  writeAll(all)
  return record
}

export function updateMeetingSchedule(input: unknown): MeetingSchedule {
  const validated = validateUpdateMeetingScheduleInput(input)
  if (!validated) {
    throw new Error('Invalid meeting schedule update')
  }
  const all = readAll()
  const idx = all.findIndex((s) => s.id === validated.id)
  const current = idx >= 0 ? all[idx] : undefined
  if (idx < 0 || !current) {
    throw new Error('Schedule not found')
  }
  all[idx] = applyMeetingScheduleUpdate(current, validated)
  writeAll(all)
  return all[idx]!
}

export function deleteMeetingSchedule(id: string): boolean {
  const trimmed = id.trim()
  if (!trimmed) return false
  const all = readAll()
  const next = all.filter((s) => s.id !== trimmed)
  if (next.length === all.length) return false
  writeAll(next)
  return true
}
