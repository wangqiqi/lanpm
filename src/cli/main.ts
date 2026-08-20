import { app } from 'electron'
import { runPairingCli } from './pairingCli.ts'
import { runAgentCli } from './agentCli.ts'
import { initNetwork, shutdownNetwork } from '../main/network/index.ts'
import { closeDatabase, initDatabase } from '../main/storage/index.ts'
import { ensureProfileUserDataPath } from '../main/storage/profilePaths.ts'
import { getDatabasePath } from '../main/storage/database.ts'
import { probeSqliteAtRest } from '../main/storage/sqliteAtRest.ts'

async function main(): Promise<void> {
  if (process.env.LANPM_USER_DATA) {
    app.setPath('userData', process.env.LANPM_USER_DATA)
  }
  await app.whenReady()
  ensureProfileUserDataPath()
  const kind = probeSqliteAtRest(getDatabasePath())
  const passphrase = process.env.LANPM_DB_PASSPHRASE?.trim()
  if (kind === 'encrypted' && !passphrase) {
    throw new Error('err.dbPassphraseRequired')
  }
  const db = initDatabase(passphrase && kind === 'encrypted' ? { passphrase } : undefined)
  initNetwork(db)
  const argv = process.argv.slice(2)
  try {
    if (argv[0] === 'agent') {
      await runAgentCli(argv.slice(1), db)
    } else {
      await runPairingCli(argv, db)
    }
  } finally {
    shutdownNetwork()
    closeDatabase()
    app.quit()
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`lanpm: ${message}`)
  process.exit(1)
})
