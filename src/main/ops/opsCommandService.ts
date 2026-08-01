import type { Database } from 'better-sqlite3'
import type { ParsedOpsCommand } from '../../shared/chat/opsCommand.ts'
import { listOpsMachines, sendOpsCommand } from './opsSyncService.ts'

export async function sendOpsSlashCommand(
  db: Database,
  groupId: string,
  parsed: ParsedOpsCommand
): Promise<{ requestId: string }> {
  const machines = listOpsMachines(groupId).filter((m) => m.online)
  if (machines.length === 0) {
    throw new Error('ops_no_machine')
  }

  let target = machines[0]!
  if (parsed.targetDisplayName) {
    const found = machines.find(
      (m) =>
        m.displayName === parsed.targetDisplayName ||
        m.deviceId === parsed.targetDisplayName
    )
    if (!found) throw new Error('ops_machine_not_found')
    target = found
  }

  return sendOpsCommand(db, groupId, {
    targetDeviceId: target.deviceId,
    command: parsed.command,
    args: parsed.args
  })
}
