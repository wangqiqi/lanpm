import type { TaskStatus } from './types'

/** 与 UI maxLength / DB 约定一致 */
export const TASK_TITLE_MAX_LENGTH = 200
export const TASK_DESCRIPTION_MAX_LENGTH = 4000
export const TASK_OTHER_REASON_MAX_LENGTH = 500

export type TaskValidationKey =
  | 'tree.detailTitleRequired'
  | 'task.titleTooLong'
  | 'board.otherReasonRequired'
  | 'task.otherReasonTooLong'
  | 'task.dateRangeInvalid'

export function clampProgressPercent(value: number | null | undefined): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

export function normalizeTaskTitle(title: string): string {
  return title.trim().slice(0, TASK_TITLE_MAX_LENGTH)
}

export function normalizeTaskDescription(description: string): string {
  return description.trim().slice(0, TASK_DESCRIPTION_MAX_LENGTH)
}

export function normalizeOtherReason(reason: string): string {
  return reason.trim().slice(0, TASK_OTHER_REASON_MAX_LENGTH)
}

export function validateTaskTitle(title: string): TaskValidationKey | null {
  const trimmed = title.trim()
  if (!trimmed) return 'tree.detailTitleRequired'
  if (trimmed.length > TASK_TITLE_MAX_LENGTH) return 'task.titleTooLong'
  return null
}

export function validateOtherReason(
  status: TaskStatus,
  otherReason?: string | null
): TaskValidationKey | null {
  if (status !== 'other') return null
  const trimmed = otherReason?.trim()
  if (!trimmed) return 'board.otherReasonRequired'
  if (trimmed.length > TASK_OTHER_REASON_MAX_LENGTH) return 'task.otherReasonTooLong'
  return null
}

export function validateTaskDateRange(
  startDate?: string | null,
  endDate?: string | null
): TaskValidationKey | null {
  const start = startDate?.trim()
  const end = endDate?.trim()
  if (!start || !end) return null
  if (start > end) return 'task.dateRangeInvalid'
  return null
}

export interface TaskFormFields {
  title: string
  status: TaskStatus
  otherReason?: string | null
  startDate?: string | null
  endDate?: string | null
}

/** 保存/创建前统一校验，返回首个错误 i18n key。 */
export function validateTaskForm(fields: TaskFormFields): TaskValidationKey | null {
  const titleErr = validateTaskTitle(fields.title)
  if (titleErr) return titleErr
  const reasonErr = validateOtherReason(fields.status, fields.otherReason)
  if (reasonErr) return reasonErr
  return validateTaskDateRange(fields.startDate, fields.endDate)
}
