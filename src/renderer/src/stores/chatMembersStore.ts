import { create } from 'zustand'
import type { GroupMemberView } from '@shared/chat/members'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

interface ChatMembersState {
  membersByGroup: Record<string, GroupMemberView[]>
  loadMembers: (groupId: string) => Promise<GroupMemberView[]>
  getMemberDisplayName: (groupId: string, userId: string) => string
}

export const useChatMembersStore = create<ChatMembersState>((set, get) => ({
  membersByGroup: {},
  loadMembers: async (groupId) => {
    try {
      const members = await getLanpmApi().chat.listMembers(groupId)
      set((s) => ({ membersByGroup: { ...s.membersByGroup, [groupId]: members } }))
      return members
    } catch {
      set((s) => ({ membersByGroup: { ...s.membersByGroup, [groupId]: [] } }))
      return []
    }
  },
  getMemberDisplayName: (groupId, userId) => {
    const member = get().membersByGroup[groupId]?.find((m) => m.userId === userId)
    return member?.displayName ?? userId
  }
}))
