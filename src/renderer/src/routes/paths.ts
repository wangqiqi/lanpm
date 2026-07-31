import type { AppView } from '@shared/navigation/types'
import type { MessageKey } from '@renderer/i18n/types'

export const DEFAULT_GROUP_ID = 'demo-project'

const CORE_APP_VIEWS = new Set<string>([
  'chat',
  'board',
  'tree',
  'gantt',
  'calendar',
  'whiteboard',
  'files'
])

export function isCoreAppView(segment: string | null | undefined): segment is AppView {
  return segment != null && CORE_APP_VIEWS.has(segment)
}

export function isDemoGroupId(groupId: string): boolean {
  return groupId.startsWith('demo-')
}

/** 优先真实群（非 demo-*），否则首群或 demo 占位 */
export function pickDefaultGroupId(
  groups: { groupId: string }[],
  preferred?: string
): string {
  if (preferred && groups.some((g) => g.groupId === preferred)) return preferred
  const real = groups.find((g) => !isDemoGroupId(g.groupId))
  return real?.groupId ?? groups[0]?.groupId ?? ''
}

export function groupViewPath(groupId: string, view: AppView): string {
  return `/g/${groupId}/${view}`
}

export function contributedViewPath(groupId: string, route: string): string {
  return `/g/${groupId}/${route}`
}

export function parseGroupViewSegment(pathname: string): string | null {
  const m = /\/g\/[^/]+\/(\w+)/.exec(pathname)
  return m?.[1] ?? null
}

export function cockpitPath(): string {
  return '/cockpit'
}

const GROUP_VIEW_PATH_RE = /^\/g\/([^/]+)\/(\w+)/

/** 驾驶舱返回：优先恢复当前群的上次视图，否则进入该群默认聊天页 */
export function cockpitReturnPath(
  activeGroupId: string,
  lastNonCockpitPath: string | null,
  fallbackView: AppView = 'chat'
): string {
  if (lastNonCockpitPath) {
    const match = GROUP_VIEW_PATH_RE.exec(lastNonCockpitPath)
    if (match && match[1] === activeGroupId) return lastNonCockpitPath
  }
  return groupViewPath(activeGroupId, fallbackView)
}

export interface ViewTabDef {
  view: AppView
  labelKey:
    | 'nav.chat'
    | 'nav.board'
    | 'nav.tree'
    | 'nav.gantt'
    | 'nav.calendar'
    | 'nav.whiteboard'
    | 'nav.files'
  icon: 'chat' | 'board' | 'tree' | 'gantt' | 'calendar' | 'whiteboard' | 'files'
}

export interface ContributedTabDef {
  route: string
  titleKey: MessageKey
  icon: string
  pluginId: string
  groupTypes: import('@shared/navigation/types').GroupType[]
}

export const VIEW_TABS: ViewTabDef[] = [
  { view: 'chat', labelKey: 'nav.chat', icon: 'chat' },
  { view: 'board', labelKey: 'nav.board', icon: 'board' },
  { view: 'tree', labelKey: 'nav.tree', icon: 'tree' },
  { view: 'gantt', labelKey: 'nav.gantt', icon: 'gantt' },
  { view: 'calendar', labelKey: 'nav.calendar', icon: 'calendar' },
  { view: 'whiteboard', labelKey: 'nav.whiteboard', icon: 'whiteboard' },
  { view: 'files', labelKey: 'nav.files', icon: 'files' }
]
