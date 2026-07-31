import type { AppView, GroupType } from './types.ts'
import { isViewAllowedForGroup } from './tabRules.ts'

export interface NavPreferences {
  /** 用户隐藏的核心 Tab（仍受群类型与主轴约束） */
  hiddenViews: AppView[]
  /** 可见 Tab 的显示顺序 */
  order: AppView[]
}

export const ALL_APP_VIEWS: AppView[] = [
  'chat',
  'board',
  'tree',
  'gantt',
  'calendar',
  'whiteboard',
  'files'
]

const TASK_ENTRY_VIEWS: AppView[] = ['board', 'tree']

export const DEFAULT_NAV_PREFERENCES: NavPreferences = {
  hiddenViews: [],
  order: [...ALL_APP_VIEWS]
}

function isAppView(value: unknown): value is AppView {
  return typeof value === 'string' && (ALL_APP_VIEWS as string[]).includes(value)
}

/** 校验并合并默认；损坏输入回退默认字段 */
export function normalizeNavPreferences(raw: unknown): NavPreferences {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_NAV_PREFERENCES, order: [...DEFAULT_NAV_PREFERENCES.order] }
  }

  const record = raw as Record<string, unknown>
  const hiddenViews = Array.isArray(record.hiddenViews)
    ? [...new Set(record.hiddenViews.filter(isAppView))]
    : []

  let order: AppView[] = []
  if (Array.isArray(record.order)) {
    order = [...new Set(record.order.filter(isAppView))]
  }
  for (const view of ALL_APP_VIEWS) {
    if (!order.includes(view)) order.push(view)
  }

  return sanitizeNavPreferences({ hiddenViews, order })
}

/** 应用主轴硬约束（chat 不可藏 · board/tree 至少留一） */
export function sanitizeNavPreferences(prefs: NavPreferences): NavPreferences {
  const hidden = new Set<AppView>(prefs.hiddenViews.filter((v) => v !== 'chat'))

  const visibleTask = TASK_ENTRY_VIEWS.filter((v) => !hidden.has(v))
  if (visibleTask.length === 0) {
    hidden.delete('board')
  } else if (visibleTask.length === 1) {
    hidden.delete(visibleTask[0]!)
  }

  const order = [...prefs.order]
  for (const view of ALL_APP_VIEWS) {
    if (!order.includes(view)) order.push(view)
  }

  return {
    hiddenViews: [...hidden],
    order
  }
}

export function resolveVisibleViews(
  groupType: GroupType,
  prefs: NavPreferences,
  groupId?: string
): AppView[] {
  const sanitized = sanitizeNavPreferences(prefs)
  const hidden = new Set(sanitized.hiddenViews)

  const allowed = ALL_APP_VIEWS.filter((view) =>
    isViewAllowedForGroup(groupType, view, groupId)
  )

  const visible = allowed.filter((view) => !hidden.has(view))

  const orderIndex = new Map(sanitized.order.map((view, index) => [view, index]))
  visible.sort((a, b) => (orderIndex.get(a) ?? 999) - (orderIndex.get(b) ?? 999))

  return visible
}

export function isViewVisibleForGroup(
  groupType: GroupType,
  prefs: NavPreferences,
  view: AppView,
  groupId?: string
): boolean {
  return resolveVisibleViews(groupType, prefs, groupId).includes(view)
}

/** Profile 设置页：该视图是否禁止关闭（主轴） */
export function isViewHideLocked(prefs: NavPreferences, view: AppView): boolean {
  if (view === 'chat') return true
  if (!TASK_ENTRY_VIEWS.includes(view)) return false

  const sanitized = sanitizeNavPreferences(prefs)
  const hidden = new Set(sanitized.hiddenViews)
  const visibleTask = TASK_ENTRY_VIEWS.filter((v) => !hidden.has(v))
  return visibleTask.length === 1 && visibleTask[0] === view
}

export function firstVisibleViewForGroup(
  groupType: GroupType,
  prefs: NavPreferences,
  groupId?: string
): AppView {
  const visible = resolveVisibleViews(groupType, prefs, groupId)
  return visible[0] ?? 'chat'
}
