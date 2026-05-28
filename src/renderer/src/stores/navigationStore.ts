import { create } from 'zustand'
import type { GroupType, NavGroup } from '@shared/navigation/types'
import type { CreateGroupInput, GroupRecord } from '@shared/group/types'
import { isDmGroupId } from '@shared/chat/dmSession'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

const FALLBACK_GROUPS: NavGroup[] = [
  { groupId: 'demo-project', name: '示例项目', type: 'project' },
  { groupId: 'demo-function', name: '示例职能群', type: 'function' },
  { groupId: 'demo-anonymous', name: '示例匿名群', type: 'anonymous' }
]

function toNavGroup(record: GroupRecord): NavGroup {
  return { groupId: record.groupId, name: record.name, type: record.type }
}

interface NavigationState {
  groups: NavGroup[]
  activeGroupId: string
  groupsLoaded: boolean
  setActiveGroupId: (groupId: string) => void
  loadGroups: () => Promise<void>
  createGroup: (input: CreateGroupInput) => Promise<NavGroup>
  getActiveGroup: () => NavGroup | undefined
  getGroupType: (groupId: string) => GroupType
  getGroupLabel: (groupId: string) => string
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  groups: FALLBACK_GROUPS,
  activeGroupId: FALLBACK_GROUPS[0].groupId,
  groupsLoaded: false,
  setActiveGroupId: (groupId) => set({ activeGroupId: groupId }),

  loadGroups: async () => {
    try {
      const records = await getLanpmApi().group.list()
      const groups = records.map(toNavGroup)
      if (groups.length > 0) {
        set((s) => ({
          groups,
          groupsLoaded: true,
          activeGroupId: groups.some((g) => g.groupId === s.activeGroupId)
            ? s.activeGroupId
            : groups[0].groupId
        }))
      } else {
        set({ groupsLoaded: true })
      }
    } catch {
      set({ groupsLoaded: true })
    }
  },

  createGroup: async (input) => {
    const record = await getLanpmApi().group.create(input)
    const nav = toNavGroup(record)
    set((s) => ({ groups: [...s.groups, nav], activeGroupId: nav.groupId }))
    return nav
  },

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
