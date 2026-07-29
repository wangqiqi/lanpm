import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { app, safeStorage } from 'electron'
import type { Database } from 'better-sqlite3'
import { throwLanpm } from '../../shared/errors/lanpmError.ts'
import type { AiConfigInput, AiConfigView, AiProvider } from '../../shared/cockpit/types.ts'
import { getLocalUserId } from '../identity/setup.ts'

interface AiConfigRow {
  user_id: string
  provider: string
  api_key_enc: string
  base_url: string
  model: string
  enabled: number
  data_policy: string
  patrol_enabled: number
  patrol_interval_hours: number
}

const DEV_FALLBACK_SECRET = createHash('sha256').update('lanpm-dev-ai-key').digest()

/** Packaged builds must use OS safeStorage; hardcoded-dev cipher is development-only. */
function allowDevKeyFallback(): boolean {
  return !app.isPackaged
}

function encryptApiKey(plain: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return `safe:${safeStorage.encryptString(plain).toString('base64')}`
  }
  if (!allowDevKeyFallback()) {
    throwLanpm('err.apiKeySafeStorageRequired')
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', DEV_FALLBACK_SECRET, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `dev:${Buffer.concat([iv, tag, enc]).toString('base64')}`
}

function decryptApiKey(stored: string): string {
  if (stored.startsWith('safe:')) {
    const buf = Buffer.from(stored.slice(5), 'base64')
    return safeStorage.decryptString(buf)
  }
  if (stored.startsWith('dev:')) {
    if (!allowDevKeyFallback()) {
      throwLanpm('err.apiKeyDevFallbackForbidden')
    }
    const buf = Buffer.from(stored.slice(4), 'base64')
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const data = buf.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', DEV_FALLBACK_SECRET, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  }
  throwLanpm('err.apiKeyDecryptFailed')
}

function rowToView(row: AiConfigRow): AiConfigView {
  return {
    provider: row.provider as AiProvider,
    baseUrl: row.base_url,
    model: row.model,
    enabled: row.enabled === 1,
    dataPolicy: 'desensitized-only',
    hasApiKey: Boolean(row.api_key_enc),
    patrolEnabled: row.patrol_enabled !== 0,
    patrolIntervalHours: row.patrol_interval_hours > 0 ? row.patrol_interval_hours : 24
  }
}

function requireLocalUserId(db: Database): string {
  const userId = getLocalUserId(db)
  if (!userId) throwLanpm('stub.identityRequired')
  return userId
}

function existingPatrolHours(db: Database, userId: string): number {
  const row = db
    .prepare(`SELECT patrol_interval_hours FROM ai_config WHERE user_id = @userId`)
    .get({ userId }) as { patrol_interval_hours: number } | undefined
  return row && row.patrol_interval_hours > 0 ? row.patrol_interval_hours : 24
}

export function getAiConfig(db: Database): AiConfigView | null {
  const userId = getLocalUserId(db)
  if (!userId) return null
  const row = db
    .prepare(`SELECT * FROM ai_config WHERE user_id = @userId`)
    .get({ userId }) as AiConfigRow | undefined
  return row ? rowToView(row) : null
}

export function saveAiConfig(db: Database, input: AiConfigInput): AiConfigView {
  const userId = requireLocalUserId(db)
  const existing = db
    .prepare(`SELECT api_key_enc FROM ai_config WHERE user_id = @userId`)
    .get({ userId }) as { api_key_enc: string } | undefined

  let apiKeyEnc = existing?.api_key_enc ?? ''
  if (input.apiKey?.trim()) {
    apiKeyEnc = encryptApiKey(input.apiKey.trim())
  }
  if (!apiKeyEnc) {
    throwLanpm('err.apiKeyRequired')
  }

  db.prepare(
    `INSERT INTO ai_config (
       user_id, provider, api_key_enc, base_url, model, enabled, data_policy,
       patrol_enabled, patrol_interval_hours
     )
     VALUES (
       @userId, @provider, @apiKeyEnc, @baseUrl, @model, @enabled, 'desensitized-only',
       @patrolEnabled, @patrolIntervalHours
     )
     ON CONFLICT(user_id) DO UPDATE SET
       provider = excluded.provider,
       api_key_enc = excluded.api_key_enc,
       base_url = excluded.base_url,
       model = excluded.model,
       enabled = excluded.enabled,
       patrol_enabled = excluded.patrol_enabled,
       patrol_interval_hours = excluded.patrol_interval_hours`
  ).run({
    userId,
    provider: input.provider,
    apiKeyEnc,
    baseUrl: input.baseUrl.trim(),
    model: input.model.trim(),
    enabled: input.enabled ? 1 : 0,
    patrolEnabled: input.patrolEnabled === false ? 0 : 1,
    patrolIntervalHours: input.patrolIntervalHours ?? existingPatrolHours(db, userId)
  })

  return getAiConfig(db)!
}

export function getDecryptedApiKey(db: Database): string | null {
  const userId = getLocalUserId(db)
  if (!userId) return null
  const row = db
    .prepare(`SELECT api_key_enc FROM ai_config WHERE user_id = @userId`)
    .get({ userId }) as { api_key_enc: string } | undefined
  if (!row?.api_key_enc) return null
  try {
    return decryptApiKey(row.api_key_enc)
  } catch {
    return null
  }
}
