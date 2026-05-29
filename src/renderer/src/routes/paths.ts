import type { AppView } from '@shared/navigation/types'

export const DEFAULT_GROUP_ID = 'demo-project'

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
  return real?.groupId ?? groups[0]?.groupId ?? DEFAULT_GROUP_ID
}

export function groupViewPath(groupId: string, view: AppView): string {
  return `/g/${groupId}/${view}`
}

export function cockpitPath(): string {
  return '/cockpit'
}

export interface ViewTabDef {
  view: AppView
  labelKey: 'nav.chat' | 'nav.board' | 'nav.tree' | 'nav.gantt' | 'nav.files'
  icon: 'chat' | 'board' | 'tree' | 'gantt' | 'files'
}

export const VIEW_TABS: ViewTabDef[] = [
  { view: 'chat', labelKey: 'nav.chat', icon: 'chat' },
  { view: 'board', labelKey: 'nav.board', icon: 'board' },
  { view: 'tree', labelKey: 'nav.tree', icon: 'tree' },
  { view: 'gantt', labelKey: 'nav.gantt', icon: 'gantt' },
  { view: 'files', labelKey: 'nav.files', icon: 'files' }
]
