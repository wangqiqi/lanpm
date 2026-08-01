import { OPS_COMMAND_NAMES } from '../../shared/ops/types.ts'
import type { OpsMachineRecord } from '../../shared/ops/types.ts'

const COMMAND_HINTS: Record<string, string> = {
  help: 'list commands and machines',
  logs: '/logs [app|nginx] — fetch log file',
  status: 'CPU / memory / disk summary',
  disk: 'disk usage snapshot',
  ps: 'process list (read-only)',
  tail: '/tail <path|key> — tail log lines (whitelist)',
  deploy: '/deploy [name] — write package to inboundDir'
}

export function formatGroupOpsHelp(
  machines: Pick<OpsMachineRecord, 'displayName' | 'deviceId' | 'online'>[],
  targetDisplayName?: string
): string {
  const lines = ['LanPM Ops commands:']
  for (const name of OPS_COMMAND_NAMES) {
    if (name === 'help') continue
    lines.push(`  /${name} — ${COMMAND_HINTS[name] ?? name}`)
  }

  lines.push('', 'Machines in this group:')
  if (machines.length === 0) {
    lines.push('  (no machines registered)')
  } else {
    for (const m of machines) {
      const status = m.online ? 'online' : 'offline'
      lines.push(`  ${m.displayName} (${m.deviceId}) — ${status}`)
    }
  }

  const online = machines.filter((m) => m.online)
  let tipTarget = targetDisplayName
  if (!tipTarget && online.length > 0) {
    tipTarget = online[0]!.displayName
  }
  if (tipTarget) {
    lines.push('', `Usage: @${tipTarget} /logs app`)
  }

  return lines.join('\n')
}
