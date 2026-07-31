import type { AppView, GroupType } from './types.ts'
import { isViewAllowedForGroup } from './tabRules.ts'

export interface NavPreferences {
  /** 用户隐藏的核心 Tab（仍受群类型与主轴约束） */
  hiddenViews: AppView[]
  /** 可见核心 Tab 的显示顺序 */
  order: AppView[]
  /** 用户隐藏的插件贡献路由（Layer C `views[].route`） */
  hiddenContributedRoutes: string[]
  /** 贡献 Tab 在核心 Tab 之后的显示顺序 */
  contributedOrder: string[]
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
  order: [...ALL_APP_VIEWS],
  hiddenContributedRoutes: [],
  contributedOrder: []
}

/** 持久化文档：全局偏好 + 按群整包覆盖 */
export interface NavPreferencesDocument {
  global: NavPreferences
  byGroup: Record<string, NavPreferences>
}

export const DEFAULT_NAV_PREFERENCES_DOCUMENT: NavPreferencesDocument = {
  global: DEFAULT_NAV_PREFERENCES,
  byGroup: {}
}

const MAX_GROUP_ID_LENGTH = 256

function isGroupIdKey(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= MAX_GROUP_ID_LENGTH
}

function isLegacyNavPreferencesRaw(record: Record<string, unknown>): boolean {
  return (
    !('global' in record) &&
    (Array.isArray(record.hiddenViews) ||
      Array.isArray(record.order) ||
      Array.isArray(record.hiddenContributedRoutes) ||
      Array.isArray(record.contributedOrder))
  )
}

/** 校验文档；旧版扁平 `NavPreferences` JSON 自动迁移为 `{ global, byGroup: {} }` */
export function normalizeNavPreferencesDocument(raw: unknown): NavPreferencesDocument {
  if (!raw || typeof raw !== 'object') {
    return {
      global: normalizeNavPreferences(DEFAULT_NAV_PREFERENCES),
      byGroup: {}
    }
  }

  const record = raw as Record<string, unknown>
  if (isLegacyNavPreferencesRaw(record)) {
    return {
      global: normalizeNavPreferences(record),
      byGroup: {}
    }
  }

  const global = normalizeNavPreferences(record.global ?? DEFAULT_NAV_PREFERENCES)
  const byGroup: Record<string, NavPreferences> = {}
  if (record.byGroup && typeof record.byGroup === 'object') {
    for (const [groupId, prefs] of Object.entries(record.byGroup as Record<string, unknown>)) {
      if (!isGroupIdKey(groupId)) continue
      byGroup[groupId.trim()] = normalizeNavPreferences(prefs)
    }
  }

  return { global, byGroup }
}

/** 本群有效偏好：有整包覆盖则用覆盖，否则回落 global */
export function resolveNavPreferencesForGroup(
  doc: NavPreferencesDocument,
  groupId?: string | null
): NavPreferences {
  const normalized = normalizeNavPreferencesDocument(doc)
  if (!groupId || !isGroupIdKey(groupId)) {
    return normalized.global
  }
  const override = normalized.byGroup[groupId]
  return override ?? normalized.global
}

export function hasGroupNavOverride(doc: NavPreferencesDocument, groupId: string): boolean {
  const normalized = normalizeNavPreferencesDocument(doc)
  return isGroupIdKey(groupId) && Object.prototype.hasOwnProperty.call(normalized.byGroup, groupId)
}

function isAppView(value: unknown): value is AppView {
  return typeof value === 'string' && (ALL_APP_VIEWS as string[]).includes(value)
}

function isContributedRoute(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value.trim())
}

/** 校验并合并默认；损坏输入回退默认字段 */
export function normalizeNavPreferences(raw: unknown): NavPreferences {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_NAV_PREFERENCES,
      order: [...DEFAULT_NAV_PREFERENCES.order],
      hiddenContributedRoutes: [],
      contributedOrder: []
    }
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

  const hiddenContributedRoutes = Array.isArray(record.hiddenContributedRoutes)
    ? [...new Set(record.hiddenContributedRoutes.filter(isContributedRoute).map((r) => r.trim()))]
    : []

  const contributedOrder = Array.isArray(record.contributedOrder)
    ? [...new Set(record.contributedOrder.filter(isContributedRoute).map((r) => r.trim()))]
    : []

  return sanitizeNavPreferences({
    hiddenViews,
    order,
    hiddenContributedRoutes,
    contributedOrder
  })
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

  const hiddenContributedRoutes = [
    ...new Set(prefs.hiddenContributedRoutes.filter(isContributedRoute).map((r) => r.trim()))
  ]
  const contributedOrder = [
    ...new Set(prefs.contributedOrder.filter(isContributedRoute).map((r) => r.trim()))
  ]

  return {
    hiddenViews: [...hidden],
    order,
    hiddenContributedRoutes,
    contributedOrder
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

/**
 * 按偏好过滤/排序贡献 Tab（核心 Tab 之后的独立段）。
 * `knownRoutes` 为当前已发现的贡献路由；未知 prefs 项保留在 store，渲染时跳过。
 */
export function resolveVisibleContributedRoutes(
  prefs: NavPreferences,
  knownRoutes: string[]
): string[] {
  const sanitized = sanitizeNavPreferences(prefs)
  const hidden = new Set(sanitized.hiddenContributedRoutes)
  const known = knownRoutes.filter((r) => isContributedRoute(r))
  const visible = known.filter((route) => !hidden.has(route))

  const orderIndex = new Map(sanitized.contributedOrder.map((route, index) => [route, index]))
  visible.sort((a, b) => {
    const ai = orderIndex.has(a) ? orderIndex.get(a)! : 1000 + known.indexOf(a)
    const bi = orderIndex.has(b) ? orderIndex.get(b)! : 1000 + known.indexOf(b)
    return ai - bi
  })
  return visible
}

export function isContributedRouteVisible(
  prefs: NavPreferences,
  route: string
): boolean {
  if (!isContributedRoute(route)) return false
  const sanitized = sanitizeNavPreferences(prefs)
  return !sanitized.hiddenContributedRoutes.includes(route)
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
