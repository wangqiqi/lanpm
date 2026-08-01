import type { Database } from 'better-sqlite3'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { getSetupStatus } from '../identity/setup.ts'
import { joinWithPairingCode } from '../discover/pairingService.ts'
import { initOpsSyncService, registerLocalOpsAgent, markOpsAgentOffline } from '../ops/opsSyncService.ts'
import { getNetworkTransport } from '../network/index.ts'
import { listUserGroups } from '../group/groupService.ts'

export interface AgentCliStartOptions {
  displayName: string
  root: string
  pairingCode?: string
  pairingHost?: string
}

export function agentCliHelp(): string {
  return [
    'lanpm agent start --name <display> [--root <dir>] [--pairing-code <code> [--host <ip>]]',
    '',
    'Headless ops agent: pairs into LanPM, registers machine member, handles ops_command.'
  ].join('\n')
}

export function parseAgentCliArgs(argv: string[]): {
  command: 'start' | 'help'
  start?: AgentCliStartOptions
} {
  if (argv.length === 0 || argv[0] === 'help' || argv[0] === '--help') {
    return { command: 'help' }
  }
  if (argv[0] !== 'start') throw new Error(`unknown_agent_command:${argv[0]}`)
  let displayName = 'lanpm-agent'
  let root = './data'
  let pairingCode: string | undefined
  let pairingHost: string | undefined
  for (let i = 1; i < argv.length; i++) {
    const token = argv[i]
    if (token === '--name' && argv[i + 1]) {
      displayName = argv[++i]!
      continue
    }
    if (token === '--root' && argv[i + 1]) {
      root = argv[++i]!
      continue
    }
    if (token === '--pairing-code' && argv[i + 1]) {
      pairingCode = argv[++i]!
      continue
    }
    if (token === '--host' && argv[i + 1]) {
      pairingHost = argv[++i]!
      continue
    }
  }
  return { command: 'start', start: { displayName, root, pairingCode, pairingHost } }
}

function ensureAgentDirs(root: string): void {
  mkdirSync(join(root, 'inbound'), { recursive: true })
  mkdirSync(join(root, 'outbound', 'logs'), { recursive: true })
  const appLog = join(root, 'outbound', 'logs', 'app.log')
  if (!existsSync(appLog)) {
    writeFileSync(appLog, 'LanPM ops agent log placeholder\n', 'utf8')
  }
}

export async function runAgentCli(argv: string[], db: Database): Promise<void> {
  const parsed = parseAgentCliArgs(argv)
  if (parsed.command === 'help') {
    console.log(agentCliHelp())
    return
  }
  if (!parsed.start) throw new Error('agent_start_required')

  const status = getSetupStatus(db)
  if (!status.configured || !status.device) {
    throw new Error('identity_required — configure user/device before agent start')
  }

  ensureAgentDirs(parsed.start.root)

  if (parsed.start.pairingCode) {
    await joinWithPairingCode(db, {
      code: parsed.start.pairingCode,
      unicastHost: parsed.start.pairingHost
    })
  }

  initOpsSyncService(db)
  const groups = listUserGroups(db).map((g) => g.groupId)
  await registerLocalOpsAgent(db, {
    deviceId: status.device.deviceId,
    displayName: parsed.start.displayName,
    groupIds: groups,
    root: parsed.start.root
  })

  console.log(`agent_online name=${parsed.start.displayName} device=${status.device.deviceId}`)
  console.log(`root=${parsed.start.root} groups=${groups.length}`)

  const transport = getNetworkTransport()
  if (!transport) {
    throw new Error('network_not_ready')
  }

  await new Promise<void>((resolve) => {
    const onStop = (): void => {
      void markOpsAgentOffline(db, status.device!.deviceId).finally(resolve)
    }
    process.once('SIGINT', onStop)
    process.once('SIGTERM', onStop)
  })
}
