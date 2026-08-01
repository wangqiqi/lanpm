import { ipcMain } from 'electron'
import { OPS_IPC } from '../../shared/ops/channels.ts'
import { getDatabase } from '../storage'
import { sendOpsSlashCommand } from '../ops/opsCommandService.ts'
import { listOpsMachines } from '../ops/opsSyncService.ts'
import { listOpsAuditEntries } from '../ops/auditStore.ts'
import {
  getOpsGroupSettings,
  patchOpsGroupSettings
} from '../ops/opsGroupSettingsStore.ts'
import { refreshOutboundWatchers } from '../ops/outboundWatchService.ts'
import { parseOpsCommand } from '../../shared/chat/opsCommand.ts'
import type { OpsGatewayConfigPatch } from '../../shared/ops/gatewayTypes.ts'
import type { OpsGroupSettingsPatch } from '../../shared/ops/groupSettings.ts'
import {
  getGatewayStatus,
  patchGatewayConfig,
  rotateGatewayToken,
  startGateway,
  stopGateway
} from '../ops/gatewayService.ts'

export function registerOpsIpc(): void {
  ipcMain.handle(
    OPS_IPC.sendSlash,
    async (
      _event,
      groupId: string,
      text: string,
      options?: { linkTaskId?: string }
    ) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (typeof text !== 'string' || !text.trim()) throw new Error('text required')
      const parsed = parseOpsCommand(text)
      if (!parsed) throw new Error('ops_invalid_command')
      return sendOpsSlashCommand(getDatabase(), groupId, parsed, text, options)
    }
  )

  ipcMain.handle(OPS_IPC.listMachines, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return listOpsMachines(groupId)
  })

  ipcMain.handle(
    OPS_IPC.listAudit,
    (_event, groupId?: string, limit?: number) => {
      if (groupId != null && typeof groupId !== 'string') throw new Error('groupId invalid')
      const safeLimit = typeof limit === 'number' && limit > 0 ? Math.min(limit, 200) : 50
      return listOpsAuditEntries(groupId || undefined, safeLimit)
    }
  )

  ipcMain.handle(OPS_IPC.getGroupSettings, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return getOpsGroupSettings(groupId)
  })

  ipcMain.handle(
    OPS_IPC.updateGroupSettings,
    (_event, groupId: string, patch: OpsGroupSettingsPatch) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (!patch || typeof patch !== 'object') throw new Error('patch required')
      const db = getDatabase()
      const next = patchOpsGroupSettings(groupId, patch)
      refreshOutboundWatchers(db)
      return next
    }
  )

  ipcMain.handle(OPS_IPC.getGatewayStatus, () => getGatewayStatus())

  ipcMain.handle(OPS_IPC.startGateway, () => startGateway())

  ipcMain.handle(OPS_IPC.stopGateway, () => stopGateway())

  ipcMain.handle(OPS_IPC.updateGatewayConfig, (_event, patch: OpsGatewayConfigPatch) => {
    if (!patch || typeof patch !== 'object') throw new Error('patch required')
    return patchGatewayConfig(patch)
  })

  ipcMain.handle(OPS_IPC.rotateGatewayToken, () => rotateGatewayToken())
}
