import { describe, expect, it } from 'vitest'
import { shouldShowBoardRecentDot, BOARD_RECENT_WINDOW_MS } from '@shared/badge/boardRecentDot'

describe('shouldShowBoardRecentDot (TASK-206)', () => {
  const now = '2026-07-11T12:00:00.000Z'
  const recent = '2026-07-11T10:00:00.000Z'
  const old = '2026-07-08T10:00:00.000Z'

  it('hides when boardMineOpen > 0', () => {
    expect(
      shouldShowBoardRecentDot({
        boardMineOpen: 2,
        boardLatestUpdatedAt: recent,
        lastBoardSeenAt: null,
        nowIso: now
      })
    ).toBe(false)
  })

  it('shows when mine open is 0, recent, and never seen', () => {
    expect(
      shouldShowBoardRecentDot({
        boardMineOpen: 0,
        boardLatestUpdatedAt: recent,
        lastBoardSeenAt: null,
        nowIso: now
      })
    ).toBe(true)
  })

  it('hides when latest is outside window', () => {
    expect(
      shouldShowBoardRecentDot({
        boardMineOpen: 0,
        boardLatestUpdatedAt: old,
        lastBoardSeenAt: null,
        nowIso: now,
        windowMs: BOARD_RECENT_WINDOW_MS
      })
    ).toBe(false)
  })

  it('hides when already seen after latest', () => {
    expect(
      shouldShowBoardRecentDot({
        boardMineOpen: 0,
        boardLatestUpdatedAt: recent,
        lastBoardSeenAt: '2026-07-11T11:00:00.000Z',
        nowIso: now
      })
    ).toBe(false)
  })

  it('shows when seen before latest', () => {
    expect(
      shouldShowBoardRecentDot({
        boardMineOpen: 0,
        boardLatestUpdatedAt: recent,
        lastBoardSeenAt: '2026-07-11T09:00:00.000Z',
        nowIso: now
      })
    ).toBe(true)
  })
})
