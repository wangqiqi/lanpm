import type { Database } from 'better-sqlite3'
import { PAIRING_TTL_MS } from '../shared/network/pairingTypes.ts'
import {
  cancelPairingSession,
  joinWithPairingCode,
  startPairingSession
} from '../main/discover/pairingService.ts'
import {
  parsePairingCliArgs,
  pairingCliHelp,
  type PairingCliJoinOptions
} from './pairingCliArgs.ts'

export { parsePairingCliArgs, pairingCliHelp, type PairingCliJoinOptions }

export async function runPairingStart(): Promise<void> {
  const session = startPairingSession()
  const expiresMs = new Date(session.expiresAt).getTime() - Date.now()
  console.log(`code=${session.code}`)
  console.log(`display=${session.codeDisplay}`)
  if (session.localIp) {
    console.log(`host=${session.localIp}`)
    if (session.localIpTail) console.log(`tail=${session.localIpTail}`)
  }
  console.log(`ttl_sec=${Math.max(0, Math.ceil(expiresMs / 1000))}`)
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      cancelPairingSession()
      resolve()
    }, Math.min(expiresMs, PAIRING_TTL_MS))
    process.once('SIGINT', () => {
      clearTimeout(timer)
      cancelPairingSession()
      resolve()
    })
  })
}

export async function runPairingJoin(db: Database, options: PairingCliJoinOptions): Promise<void> {
  const result = await joinWithPairingCode(db, {
    code: options.code,
    crossSubnet: options.crossSubnet,
    unicastHost: options.host,
    subnetScan: options.subnetScan
  })
  console.log(`connected=${result.displayName}`)
  console.log(`host=${result.host}:${result.listenPort}`)
  console.log(`groups=${result.groupIds.length}`)
}

export async function runPairingCli(argv: string[], db: Database): Promise<void> {
  const parsed = parsePairingCliArgs(argv)
  if (parsed.command === 'help') {
    console.log(pairingCliHelp())
    return
  }
  if (parsed.command === 'start') {
    await runPairingStart()
    return
  }
  if (parsed.command === 'join' && parsed.join) {
    await runPairingJoin(db, parsed.join)
    return
  }
  throw new Error('pairing_cli_invalid')
}
