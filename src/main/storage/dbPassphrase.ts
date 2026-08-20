import { throwLanpm } from '../../shared/errors/lanpmError.ts'
import type { SqliteAtRestKind } from './sqliteAtRest.ts'
import { promptDatabasePassphrase } from './unlockPassphrase.ts'

export function passphraseFromEnv(): string | undefined {
  const v = process.env.LANPM_DB_PASSPHRASE?.trim()
  return v ? v : undefined
}

/** Desktop: allowPrompt. CLI/headless: env only; missing key fail-closed. */
export async function resolveDbPassphrase(options: {
  kind: SqliteAtRestKind
  allowPrompt: boolean
}): Promise<string | undefined> {
  if (options.kind !== 'encrypted') return undefined
  const env = passphraseFromEnv()
  if (env) return env
  if (!options.allowPrompt) throwLanpm('err.dbPassphraseRequired')
  return (await promptDatabasePassphrase()) ?? undefined
}
