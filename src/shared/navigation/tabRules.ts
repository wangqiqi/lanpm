import type { AppView, GroupType } from './types'

/** 底部 Tab 可见性（docs/05 §2；M1-03 完整交互后续补） */
export function isViewAllowedForGroup(type: GroupType, view: AppView, groupId?: string): boolean {
  if (groupId?.startsWith('dm:')) return view === 'chat'
  if (type === 'anonymous') return view === 'chat'
  if (type === 'function') return view === 'chat' || view === 'files'
  return true
}

export function defaultViewForGroup(type: GroupType): AppView {
  switch (type) {
    case 'project':
      return 'board'
    case 'function':
    case 'anonymous':
      return 'chat'
  }
}

/** 驾驶舱面向跨项目主管面：仅有项目群时在顶栏突出 */
export function shouldHighlightCockpit(groups: { type: GroupType }[]): boolean {
  return groups.some((g) => g.type === 'project')
}
