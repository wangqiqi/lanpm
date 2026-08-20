import { ipcMain } from 'electron'
import type { AiConfigInput } from '../../shared/cockpit/types'
import { COCKPIT_IPC } from '../../shared/cockpit/channels'
import type { CreateGroupInput } from '../../shared/group/types'
import { GROUP_IPC } from '../../shared/group/channels'
import {
  buildCockpitDashboard,
  evaluateProjects,
  generateMonthlyReport,
  generateWeeklyReport
} from '../cockpit/cockpitService'
import {
  createUserGroup,
  dissolveGroup,
  enterAnonymousGroup,
  getGroupById,
  leaveAnonymousGroup,
  listUserGroups
} from '../group/groupService'
import {
  approveJoinRequest,
  listIncomingJoinRequests,
  rejectJoinRequest,
  requestJoinDiscoverableGroup
} from '../group/joinRequestService'
import {
  cancelGroupInvite,
  joinWithGroupInviteCode,
  startGroupInvite,
  type GroupInviteJoinInput
} from '../group/groupInviteService'
import { getAiConfig, saveAiConfig } from '../ai/aiConfigService'
import { probeAiEndpoint } from '../ai/aiEndpointProbeService'
import { refreshAiPatrolScheduler } from '../ai/aiPatrolScheduler'
import { getDatabase } from '../storage'
import { listLastMessageAtByGroup } from '../storage/repositories/messageRepository'
import { confirmDestructiveIpc } from './destructiveConfirm.ts'

export function registerGroupIpc(): void {
  ipcMain.handle(GROUP_IPC.list, () => listUserGroups(getDatabase()))

  ipcMain.handle(GROUP_IPC.listLastActivity, () => listLastMessageAtByGroup(getDatabase()))

  ipcMain.handle(GROUP_IPC.get, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return getGroupById(getDatabase(), groupId)
  })

  ipcMain.handle(GROUP_IPC.create, (_event, input: CreateGroupInput) => {
    if (!input || typeof input.name !== 'string' || !input.type) {
      throw new Error('invalid create group input')
    }
    return createUserGroup(getDatabase(), input)
  })

  ipcMain.handle(GROUP_IPC.join, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return requestJoinDiscoverableGroup(getDatabase(), groupId)
  })

  ipcMain.handle(GROUP_IPC.listJoinRequests, () => listIncomingJoinRequests(getDatabase()))

  ipcMain.handle(GROUP_IPC.approveJoinRequest, (_event, requestId: string) => {
    if (typeof requestId !== 'string' || !requestId) throw new Error('requestId required')
    return approveJoinRequest(getDatabase(), requestId)
  })

  ipcMain.handle(GROUP_IPC.rejectJoinRequest, (_event, requestId: string) => {
    if (typeof requestId !== 'string' || !requestId) throw new Error('requestId required')
    return rejectJoinRequest(getDatabase(), requestId)
  })

  ipcMain.handle(GROUP_IPC.startInvite, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return startGroupInvite(getDatabase(), groupId)
  })

  ipcMain.handle(GROUP_IPC.cancelInvite, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    cancelGroupInvite(groupId)
    return { ok: true as const }
  })

  ipcMain.handle(GROUP_IPC.joinWithInvite, (_event, input: GroupInviteJoinInput) => {
    if (!input || typeof input.code !== 'string') {
      throw new Error('group_invite_code_required')
    }
    return joinWithGroupInviteCode(getDatabase(), input)
  })

  ipcMain.handle(GROUP_IPC.leaveAnonymous, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    leaveAnonymousGroup(getDatabase(), groupId)
  })

  ipcMain.handle(GROUP_IPC.enterAnonymous, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    enterAnonymousGroup(getDatabase(), groupId)
  })

  ipcMain.handle(GROUP_IPC.dissolve, async (event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    const ok = await confirmDestructiveIpc(event.sender, 'dissolve')
    if (!ok) return
    return dissolveGroup(getDatabase(), groupId)
  })
}

export function registerCockpitIpc(): void {
  ipcMain.handle(COCKPIT_IPC.getDashboard, () => buildCockpitDashboard(getDatabase()))

  ipcMain.handle(COCKPIT_IPC.generateWeeklyReport, () => generateWeeklyReport(getDatabase()))

  ipcMain.handle(COCKPIT_IPC.generateMonthlyReport, () => generateMonthlyReport(getDatabase()))

  ipcMain.handle(COCKPIT_IPC.evaluateProjects, () => evaluateProjects(getDatabase()))

  ipcMain.handle(COCKPIT_IPC.getAiConfig, () => getAiConfig(getDatabase()))

  ipcMain.handle(COCKPIT_IPC.saveAiConfig, (_event, input: AiConfigInput) => {
    if (!input || typeof input.provider !== 'string') throw new Error('invalid ai config')
    const saved = saveAiConfig(getDatabase(), input)
    refreshAiPatrolScheduler(getDatabase())
    void probeAiEndpoint(getDatabase(), { force: true }).catch((err) => {
      console.warn('[ai-endpoint-probe] post-save probe failed:', err)
    })
    return saved
  })
}

