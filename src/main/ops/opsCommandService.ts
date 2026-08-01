import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import type { ParsedOpsCommand } from '../../shared/chat/opsCommand.ts'
import { resolveTaskByTitleToken } from '../../shared/chat/taskRefs.ts'
import { listTasksByGroup } from '../storage/repositories/taskRepository.ts'
import { publishChatMessage } from '../chat/chatService.ts'
import { formatGroupOpsHelp } from './opsHelpText.ts'
import { listOpsMachines, sendOpsCommand } from './opsSyncService.ts'

export type OpsSlashOptions = {
  linkTaskId?: string
}

function resolveTaskLinkFromText(
  db: Database,
  groupId: string,
  text: string,
  explicitLinkTaskId?: string
): string | undefined {
  if (explicitLinkTaskId) return explicitLinkTaskId
  const hashMatch = /(?:^|\s)#([^#\s]+)/.exec(text)
  if (!hashMatch) return undefined
  const tasks = listTasksByGroup(db, groupId).filter((t) => !t.deletedAt)
  return resolveTaskByTitleToken(hashMatch[1]!, tasks)?.taskId
}

export async function sendOpsSlashCommand(
  db: Database,
  groupId: string,
  parsed: ParsedOpsCommand,
  rawText: string,
  options?: OpsSlashOptions
): Promise<{ requestId: string }> {
  if (parsed.command === 'help') {
    const text = formatGroupOpsHelp(listOpsMachines(groupId), parsed.targetDisplayName)
    await publishChatMessage(db, groupId, 'text', {
      kind: 'text',
      text,
      meta: { source: 'ops-agent' }
    })
    return { requestId: `help_local_${randomUUID()}` }
  }

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

  const linkTaskId = resolveTaskLinkFromText(db, groupId, rawText, options?.linkTaskId)

  return sendOpsCommand(db, groupId, {
    targetDeviceId: target.deviceId,
    command: parsed.command,
    args: parsed.args,
    linkTaskId
  })
}
