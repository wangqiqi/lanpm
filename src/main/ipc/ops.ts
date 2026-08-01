import { ipcMain } from 'electron'
import { OPS_IPC } from '../../shared/ops/channels.ts'
import { getDatabase } from '../storage'
import { sendOpsSlashCommand } from '../ops/opsCommandService.ts'
import { listOpsMachines } from '../ops/opsSyncService.ts'
import { listOpsAuditEntries } from '../ops/auditStore.ts'
import { parseOpsCommand } from '../../shared/chat/opsCommand.ts'

export function registerOpsIpc(): void {
  ipcMain.handle(
    OPS_IPC.sendSlash,
    async (_event, groupId: string, text: string) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (typeof text !== 'string' || !text.trim()) throw new Error('text required')
      const parsed = parseOpsCommand(text)
      if (!parsed) throw new Error('ops_invalid_command')
      return sendOpsSlashCommand(getDatabase(), groupId, parsed)
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
}
