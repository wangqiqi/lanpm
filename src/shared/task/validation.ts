import type { TaskStatus } from './types'

export function validateOtherReason(status: TaskStatus, otherReason?: string | null): string | null {
  if (status !== 'other') return null
  const trimmed = otherReason?.trim()
  if (!trimmed) return '移入 OTHER 列必须填写原因'
  return null
}
