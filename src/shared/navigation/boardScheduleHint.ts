import type { AppView, GroupType } from './types.ts'

/** 看板「甘特/日历在导航偏好」提示；用户关闭后不再出现 */
export const BOARD_SCHEDULE_HINT_STORAGE_KEY = 'lanpm.nav.boardScheduleHint.dismissed.v1'

export function isScheduleViewsHiddenInPrefs(hiddenViews: readonly AppView[]): boolean {
  const set = new Set(hiddenViews)
  return set.has('gantt') || set.has('calendar')
}

export function shouldShowBoardScheduleHint(args: {
  groupType?: GroupType | null
  hiddenViews: readonly AppView[]
  dismissed: boolean
}): boolean {
  if (args.groupType !== 'project') return false
  if (args.dismissed) return false
  return isScheduleViewsHiddenInPrefs(args.hiddenViews)
}

export function readBoardScheduleHintDismissed(
  storage: Pick<Storage, 'getItem'> | null | undefined
): boolean {
  try {
    return storage?.getItem(BOARD_SCHEDULE_HINT_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeBoardScheduleHintDismissed(
  storage: Pick<Storage, 'setItem'> | null | undefined
): void {
  try {
    storage?.setItem(BOARD_SCHEDULE_HINT_STORAGE_KEY, '1')
  } catch {
    /* private mode / quota */
  }
}
