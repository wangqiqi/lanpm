import { create } from 'zustand'
import {
  loadPinnedGroupIds,
  togglePinnedGroupId
} from '@shared/group/pinnedGroups'

interface GroupPinState {
  pinnedIds: string[]
  isPinned: (groupId: string) => boolean
  togglePin: (groupId: string) => void
  reload: () => void
}

export const useGroupPinStore = create<GroupPinState>((set, get) => ({
  pinnedIds: typeof localStorage === 'undefined' ? [] : loadPinnedGroupIds(),
  isPinned: (groupId) => get().pinnedIds.includes(groupId),
  togglePin: (groupId) => {
    const next = togglePinnedGroupId(groupId)
    set({ pinnedIds: next })
  },
  reload: () => set({ pinnedIds: loadPinnedGroupIds() })
}))
