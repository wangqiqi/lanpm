import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildDmGroupId, getDmPeerUserId, isDmGroupId } from '@shared/chat/dmSession'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { groupAllowsDirectMessage } from '@shared/group/guards'
import type { GroupType } from '@shared/navigation/types'
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
    originGroupId?: string,
    originGroupType?: GroupType
  ) => string | null
  touchSession: (groupId: string) => void
  getSession: (groupId: string) => DmSession | undefined
  getPeerDisplayName: (groupId: string, peerUserId: string) => string
  pruneDisallowedOrigins: (resolveType: (groupId: string) => GroupType) => void
  /** DATA-DM-DUAL — 与 SQLite messages 中 dm:% 会话对齐 */
  syncWithDatabase: (localUserId: string) => Promise<void>
}

export const useDmStore = create<DmState>()(
  persist(
    (set, get) => ({
      sessions: [],
      lastOriginGroupId: DEFAULT_GROUP_ID,
      openSession: (peerUserId, peerDisplayName, localUserId, originGroupId, originGroupType) => {
        const groupId = buildDmGroupId(localUserId, peerUserId)
        const origin = originGroupId ?? get().lastOriginGroupId
        if (originGroupType !== undefined && !groupAllowsDirectMessage(originGroupType)) {
          return null
        }
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
      },
      pruneDisallowedOrigins: (resolveType) => {
        set((state) => ({
          sessions: state.sessions.filter((s) =>
            groupAllowsDirectMessage(resolveType(s.originGroupId))
          )
        }))
      },
      syncWithDatabase: async (localUserId) => {
        const dbIds = await getLanpmApi().data.listDmGroupIds()
        const fromDb = new Set(dbIds)
        const staleCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
        set((state) => {
          const sessions = [...state.sessions]
          for (const groupId of dbIds) {
            if (sessions.some((s) => s.groupId === groupId)) continue
            const peerUserId = getDmPeerUserId(groupId, localUserId)
            if (!peerUserId) continue
            sessions.unshift({
              groupId,
              peerUserId,
              peerDisplayName: peerUserId,
              originGroupId: state.lastOriginGroupId,
              updatedAt: new Date().toISOString()
            })
          }
          return {
            sessions: sessions
              .filter((s) => {
                if (!isDmGroupId(s.groupId)) return true
                if (fromDb.has(s.groupId)) return true
                return new Date(s.updatedAt).getTime() >= staleCutoff
              })
              .slice(0, 20)
          }
        })
      }
    }),
    { name: 'lanpm.dm.sessions' }
  )
)
