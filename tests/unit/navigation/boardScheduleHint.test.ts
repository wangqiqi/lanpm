import { describe, expect, it } from 'vitest'
import {
  BOARD_SCHEDULE_HINT_STORAGE_KEY,
  readBoardScheduleHintDismissed,
  shouldShowBoardScheduleHint,
  writeBoardScheduleHintDismissed
} from '@shared/navigation/boardScheduleHint'

describe('shouldShowBoardScheduleHint', () => {
  it('shows on project groups when gantt/calendar are hidden and not dismissed', () => {
    expect(
      shouldShowBoardScheduleHint({
        groupType: 'project',
        hiddenViews: ['gantt', 'calendar', 'whiteboard'],
        dismissed: false
      })
    ).toBe(true)
  })

  it('hides when dismissed, non-project, or schedule views already visible', () => {
    expect(
      shouldShowBoardScheduleHint({
        groupType: 'project',
        hiddenViews: ['gantt'],
        dismissed: true
      })
    ).toBe(false)
    expect(
      shouldShowBoardScheduleHint({
        groupType: 'function',
        hiddenViews: ['gantt', 'calendar'],
        dismissed: false
      })
    ).toBe(false)
    expect(
      shouldShowBoardScheduleHint({
        groupType: 'project',
        hiddenViews: ['whiteboard'],
        dismissed: false
      })
    ).toBe(false)
  })
})

describe('board schedule hint storage', () => {
  it('reads and writes dismissed flag', () => {
    const mem = new Map<string, string>()
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v)
      }
    }
    expect(readBoardScheduleHintDismissed(storage)).toBe(false)
    writeBoardScheduleHintDismissed(storage)
    expect(mem.get(BOARD_SCHEDULE_HINT_STORAGE_KEY)).toBe('1')
    expect(readBoardScheduleHintDismissed(storage)).toBe(true)
  })
})
