import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildDmGroupId } from '@shared/chat/dmSession'
import { DEFAULT_GROUP_ID } from '@renderer/routes/paths'

export interface DmSession {
  groupId: string
  peerUserId: string
  peerDisplayName: string
  originGroupId: string
  updatedAt: string
}

interface DmState {
  sessions: DmSession[]
  lastOriginGroupId: string
  openSession: (
    peerUserId: string,
    peerDisplayName: string,
    localUserId: string,
    originGroupId?: string
  ) => string
  touchSession: (groupId: string) => void
  getSession: (groupId: string) => DmSession | undefined
  getPeerDisplayName: (groupId: string, peerUserId: string) => string
}

export const useDmStore = create<DmState>()(
  persist(
    (set, get) => ({
      sessions: [],
      lastOriginGroupId: DEFAULT_GROUP_ID,
      openSession: (peerUserId, peerDisplayName, localUserId, originGroupId) => {
        const groupId = buildDmGroupId(localUserId, peerUserId)
        const origin = originGroupId ?? get().lastOriginGroupId
        const now = new Date().toISOString()
        const existing = get().sessions.find((s) => s.groupId === groupId)
        const next: DmSession = {
          groupId,
          peerUserId,
          peerDisplayName,
          originGroupId: origin,
          updatedAt: now
        }
        set((state) => {
          const rest = state.sessions.filter((s) => s.groupId !== groupId)
          return {
            lastOriginGroupId: origin,
            sessions: [next, ...rest].slice(0, 20)
          }
        })
        if (existing) {
          get().touchSession(groupId)
        }
        return groupId
      },
      touchSession: (groupId) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.groupId === groupId ? { ...s, updatedAt: new Date().toISOString() } : s
          )
        }))
      },
      getSession: (groupId) => get().sessions.find((s) => s.groupId === groupId),
      getPeerDisplayName: (groupId, peerUserId) => {
        const session = get().getSession(groupId)
        if (session) return session.peerDisplayName
        return peerUserId
      }
    }),
    { name: 'lanpm.dm.sessions' }
  )
)
