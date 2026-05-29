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
  joinDiscoverableGroup,
  leaveAnonymousGroup,
  listUserGroups
} from '../group/groupService'
import { getAiConfig, saveAiConfig } from '../ai/aiConfigService'
import { getDatabase } from '../storage'

export function registerGroupIpc(): void {
  ipcMain.handle(GROUP_IPC.list, () => listUserGroups(getDatabase()))

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
    return joinDiscoverableGroup(getDatabase(), groupId)
  })

  ipcMain.handle(GROUP_IPC.leaveAnonymous, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    leaveAnonymousGroup(getDatabase(), groupId)
  })

  ipcMain.handle(GROUP_IPC.enterAnonymous, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    enterAnonymousGroup(getDatabase(), groupId)
  })

  ipcMain.handle(GROUP_IPC.dissolve, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    dissolveGroup(getDatabase(), groupId)
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
    return saveAiConfig(getDatabase(), input)
  })
}

