import type { GatewayPaths } from '../../shared/ops/paths.ts'
import { formatStatus } from './statusSnapshot.ts'
import {
  readGatewayFile,
  resolveOutboundLogRel,
  writeGatewayFile
} from '../gateway/fileStore.ts'
import { PathForbiddenError } from '../gateway/pathGuard.ts'
import type { OpsCommandName, OpsCommandPayload } from '../../shared/ops/types.ts'
import {
  formatDiskSnapshot,
  formatPsSnapshot,
  resolveTailRel,
  tailGatewayText
} from './readOnlyCommands.ts'

export type OpsCommandExecution = {
  ok: boolean
  text?: string
  fileName?: string
  dataBase64?: string
  error?: string
}

function helpText(): string {
  return [
    'LanPM Ops commands:',
    '/help — list commands',
    '/logs [app|nginx] — fetch log file',
    '/status — CPU / memory / disk summary',
    '/disk — disk usage snapshot',
    '/ps — process list snapshot (read-only)',
    '/tail <path|key> — tail log lines (whitelist paths)',
    '/deploy [name] — write package to inboundDir'
  ].join('\n')
}

export async function executeOpsCommand(
  paths: GatewayPaths,
  payload: Pick<OpsCommandPayload, 'command' | 'args' | 'fileName' | 'dataBase64'>
): Promise<OpsCommandExecution> {
  const command = payload.command as OpsCommandName
  const args = payload.args ?? []

  try {
    switch (command) {
      case 'help':
        return { ok: true, text: helpText() }
      case 'status':
        return { ok: true, text: formatStatus(paths.root) }
      case 'disk':
        return { ok: true, text: formatDiskSnapshot(paths) }
      case 'ps':
        return { ok: true, text: await formatPsSnapshot() }
      case 'tail': {
        const rel = resolveTailRel(paths, args[0] ?? '')
        const text = await tailGatewayText(paths, rel)
        return { ok: true, text }
      }
      case 'logs': {
        const key = args[0] ?? 'app'
        const rel = resolveOutboundLogRel(paths, key)
        const data = await readGatewayFile(paths, rel)
        return { ok: true, fileName: `${key}.log`, dataBase64: data.toString('base64') }
      }
      case 'deploy': {
        const name = args[0] ?? payload.fileName ?? 'deploy.bin'
        const rel = `${paths.inboundDir.replace(/\/$/, '')}/${name}`
        const data = payload.dataBase64
          ? Buffer.from(payload.dataBase64, 'base64')
          : Buffer.from(`deploy placeholder ${new Date().toISOString()}`)
        await writeGatewayFile(paths, rel, data)
        return { ok: true, text: `deployed to ${rel} (${data.length} bytes)` }
      }
      default:
        return { ok: false, error: 'UNKNOWN_COMMAND' }
    }
  } catch (err) {
    if (err instanceof PathForbiddenError) {
      return { ok: false, error: 'PATH_FORBIDDEN' }
    }
    const message = err instanceof Error ? err.message : 'EXEC_FAILED'
    return { ok: false, error: message }
  }
}
