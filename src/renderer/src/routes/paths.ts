import type { AppView } from '@shared/navigation/types'

export const DEFAULT_GROUP_ID = 'demo-project'

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
