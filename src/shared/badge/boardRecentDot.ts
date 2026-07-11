/** 弱红点时间窗：48h（与 types.BOARD_RECENT_WINDOW_MS 保持一致） */
export const BOARD_RECENT_WINDOW_MS = 48 * 60 * 60 * 1000

export type BoardRecentDotInput = {
  boardMineOpen: number
  boardLatestUpdatedAt: string | null
  /** 本机上次进入看板的时间 ISO；null 表示从未看过 */
  lastBoardSeenAt: string | null
  /** 当前时间 ISO（由调用方传入，便于单测） */
  nowIso: string
  windowMs?: number
}

/**
 * 看板弱红点：仅当无「我的待办」数字时；
 * 且最新任务变更在窗口内，且晚于 lastBoardSeenAt。
 */
export function shouldShowBoardRecentDot(input: BoardRecentDotInput): boolean {
  if (input.boardMineOpen > 0) return false
  const latest = input.boardLatestUpdatedAt
  if (!latest) return false
  const now = Date.parse(input.nowIso)
  const latestMs = Date.parse(latest)
  if (!Number.isFinite(now) || !Number.isFinite(latestMs)) return false
  const windowMs = input.windowMs ?? BOARD_RECENT_WINDOW_MS
  if (latestMs < now - windowMs) return false
  if (input.lastBoardSeenAt) {
    const seenMs = Date.parse(input.lastBoardSeenAt)
    if (Number.isFinite(seenMs) && latestMs <= seenMs) return false
  }
  return true
}
