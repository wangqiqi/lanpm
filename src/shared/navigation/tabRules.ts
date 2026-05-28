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
    case 'function':
    case 'anonymous':
      return 'chat'
  }
}
