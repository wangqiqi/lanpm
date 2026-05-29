import type { TaskStatus } from './types'

export function validateOtherReason(status: TaskStatus, otherReason?: string | null): string | null {
  if (status !== 'other') return null
  const trimmed = otherReason?.trim()
  if (!trimmed) return 'board.otherReasonRequired'
  return null
}
