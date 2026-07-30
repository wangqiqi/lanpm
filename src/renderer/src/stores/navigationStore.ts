import { create } from 'zustand'
import type { GroupType, NavGroup } from '@shared/navigation/types'
import type { CreateGroupInput, GroupRecord } from '@shared/group/types'
import { isDmGroupId } from '@shared/chat/dmSession'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { pickDefaultGroupId } from '@renderer/routes/paths'

function toNavGroup(record: GroupRecord): NavGroup {
  return {
    groupId: record.groupId,
    name: record.name,
    type: record.type,
    createdBy: record.createdBy,
    createdAt: record.createdAt
  }
}

interface NavigationState {
  groups: NavGroup[]
  activeGroupId: string
  groupsLoaded: boolean
  groupsLoadFailed: boolean
  lastNonCockpitPath: string | null
  setActiveGroupId: (groupId: string) => void
  rememberNonCockpitPath: (path: string) => void
  loadGroups: () => Promise<boolean>
  createGroup: (input: CreateGroupInput) => Promise<NavGroup>
  joinGroup: (groupId: string) => Promise<NavGroup>
  dissolveGroup: (groupId: string) => Promise<void>
  getActiveGroup: () => NavGroup | undefined
  getGroupType: (groupId: string) => GroupType
  getGroupLabel: (groupId: string) => string
  resolveDefaultGroupId: () => string
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  groups: [],
  activeGroupId: '',
  groupsLoaded: false,
  groupsLoadFailed: false,
  lastNonCockpitPath: null,
  setActiveGroupId: (groupId) => set({ activeGroupId: groupId }),
  rememberNonCockpitPath: (path) => set({ lastNonCockpitPath: path }),

  loadGroups: async () => {
    try {
      const records = await getLanpmApi().group.list()
      const groups = records.map(toNavGroup)
      if (groups.length > 0) {
        set((s) => ({
          groups,
          groupsLoaded: true,
          groupsLoadFailed: false,
          activeGroupId: pickDefaultGroupId(groups, s.activeGroupId)
        }))
      } else {
        set({
          groups: [],
          groupsLoaded: true,
          groupsLoadFailed: false,
          activeGroupId: ''
        })
      }
      return true
    } catch {
      set({ groupsLoaded: true, groupsLoadFailed: true })
      return false
    }
  },

  resolveDefaultGroupId: () => {
    const { groups, activeGroupId } = get()
    return pickDefaultGroupId(groups, activeGroupId)
  },

  createGroup: async (input) => {
    const record = await getLanpmApi().group.create(input)
    const nav = toNavGroup(record)
    set((s) => ({ groups: [...s.groups, nav], activeGroupId: nav.groupId }))
    return nav
  },

  joinGroup: async (groupId) => {
    const result = await getLanpmApi().group.join(groupId)
    if (result.status === 'pending') {
      const err = new Error('join_pending') as Error & { code?: string }
      err.code = 'join_pending'
      throw err
    }
    const nav = toNavGroup(result.group)
    set((s) => {
      const exists = s.groups.some((g) => g.groupId === nav.groupId)
      return {
        groups: exists ? s.groups : [...s.groups, nav],
        activeGroupId: nav.groupId
      }
    })
    return nav
  },

  dissolveGroup: async (groupId) => {
    await getLanpmApi().group.dissolve(groupId)
    set((s) => {
      const groups = s.groups.filter((g) => g.groupId !== groupId)
      return {
        groups,
        activeGroupId: pickDefaultGroupId(groups, s.activeGroupId)
      }
    })
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
