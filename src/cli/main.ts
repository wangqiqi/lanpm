import { app } from 'electron'
import { runPairingCli } from './pairingCli.ts'
import { initNetwork, shutdownNetwork } from '../main/network/index.ts'
import { closeDatabase, initDatabase } from '../main/storage/index.ts'
import { ensureProfileUserDataPath } from '../main/storage/profilePaths.ts'

async function main(): Promise<void> {
  if (process.env.LANPM_USER_DATA) {
    app.setPath('userData', process.env.LANPM_USER_DATA)
  }
  await app.whenReady()
  ensureProfileUserDataPath()
  const db = initDatabase()
  initNetwork(db)
  try {
    await runPairingCli(process.argv.slice(2), db)
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
