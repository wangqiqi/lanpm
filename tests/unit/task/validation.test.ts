import { describe, expect, it } from 'vitest'
import {
  clampProgressPercent,
  normalizeTaskTitle,
  TASK_OTHER_REASON_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
  validateOtherReason,
  validateTaskDateRange,
  validateTaskForm,
  validateTaskTitle
} from '@shared/task/validation'

describe('validateOtherReason', () => {
  it('requires reason when status is other', () => {
    expect(validateOtherReason('other', '')).toBe('board.otherReasonRequired')
    expect(validateOtherReason('other', '   ')).toBe('board.otherReasonRequired')
  })

  it('accepts trimmed reason for other', () => {
    expect(validateOtherReason('other', ' blocked ')).toBeNull()
  })

  it('rejects overly long reason', () => {
    const long = 'x'.repeat(TASK_OTHER_REASON_MAX_LENGTH + 1)
    expect(validateOtherReason('other', long)).toBe('task.otherReasonTooLong')
  })

  it('ignores non-other statuses', () => {
    expect(validateOtherReason('todo', undefined)).toBeNull()
    expect(validateOtherReason('done', null)).toBeNull()
  })
})

describe('validateTaskTitle', () => {
  it('rejects empty title', () => {
    expect(validateTaskTitle('  ')).toBe('tree.detailTitleRequired')
  })

  it('rejects title over max length', () => {
    expect(validateTaskTitle('a'.repeat(TASK_TITLE_MAX_LENGTH + 1))).toBe('task.titleTooLong')
  })
})

describe('validateTaskDateRange', () => {
  it('rejects end before start', () => {
    expect(validateTaskDateRange('2026-06-10', '2026-06-01')).toBe('task.dateRangeInvalid')
  })

  it('allows partial dates', () => {
    expect(validateTaskDateRange('2026-06-01', null)).toBeNull()
  })
})

describe('validateTaskForm', () => {
  it('returns first failing rule', () => {
    expect(
      validateTaskForm({
        title: '',
        status: 'other',
        otherReason: 'ok',
        startDate: '2026-06-10',
        endDate: '2026-06-01'
      })
    ).toBe('tree.detailTitleRequired')
  })
})

describe('clampProgressPercent', () => {
  it('clamps and rounds', () => {
    expect(clampProgressPercent(-5)).toBe(0)
    expect(clampProgressPercent(150)).toBe(100)
    expect(clampProgressPercent(33.6)).toBe(34)
    expect(clampProgressPercent(Number.NaN)).toBe(0)
  })
})

describe('normalizeTaskTitle', () => {
  it('trims and truncates', () => {
    expect(normalizeTaskTitle(`  ${'a'.repeat(TASK_TITLE_MAX_LENGTH + 5)}  `)).toHaveLength(
      TASK_TITLE_MAX_LENGTH
    )
  })
})
