import { create } from 'zustand'
import type { GroupType, NavGroup } from '@shared/navigation/types'
import { isDmGroupId } from '@shared/chat/dmSession'

/** M5 前占位群组，用于路由与 Tab 规则联调 */
const STUB_GROUPS: NavGroup[] = [
  { groupId: 'demo-project', name: '示例项目', type: 'project' },
  { groupId: 'demo-function', name: '示例职能群', type: 'function' },
  { groupId: 'demo-anonymous', name: '示例匿名群', type: 'anonymous' }
]

interface NavigationState {
  groups: NavGroup[]
  activeGroupId: string
  setActiveGroupId: (groupId: string) => void
  getActiveGroup: () => NavGroup | undefined
  getGroupType: (groupId: string) => GroupType
  getGroupLabel: (groupId: string) => string
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  groups: STUB_GROUPS,
  activeGroupId: STUB_GROUPS[0].groupId,
  setActiveGroupId: (groupId) => set({ activeGroupId: groupId }),
  getActiveGroup: () => {
    const { groups, activeGroupId } = get()
    return groups.find((g) => g.groupId === activeGroupId)
  },
  getGroupType: (groupId) => {
    if (isDmGroupId(groupId)) return 'anonymous'
    const g = get().groups.find((x) => x.groupId === groupId)
    return g?.type ?? 'project'
  },
  getGroupLabel: (groupId) => {
    const g = get().groups.find((x) => x.groupId === groupId)
    return g?.name ?? groupId
  }
}))
