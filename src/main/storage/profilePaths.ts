import { app } from 'electron'
import { existsSync, mkdirSync, renameSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import DatabaseConstructor from 'better-sqlite3'
import type { Database } from 'better-sqlite3'
import { LOCAL_DEVICE_ID_KEY } from '../identity/setup'

const ACTIVE_PROFILE_FILE = 'active_profile.json'

interface ActiveProfileFile {
  userId: string
}

let rootUserDataPath: string | null = null

export function getRootUserDataPath(): string {
  return rootUserDataPath ?? app.getPath('userData')
}

function activeProfilePath(): string {
  return join(getRootUserDataPath(), ACTIVE_PROFILE_FILE)
}

function readActiveUserId(): string | null {
  const path = activeProfilePath()
  if (!existsSync(path)) return null
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as ActiveProfileFile
    return typeof parsed.userId === 'string' ? parsed.userId : null
  } catch {
    return null
  }
}

function writeActiveUserId(userId: string): void {
  writeFileSync(activeProfilePath(), JSON.stringify({ userId } satisfies ActiveProfileFile), 'utf8')
}

function resolveUserIdFromLegacyDb(legacyDbPath: string): string | null {
  if (!existsSync(legacyDbPath)) return null
  try {
    const db = new DatabaseConstructor(legacyDbPath, { readonly: true })
    const deviceId = db
      .prepare(`SELECT value FROM sync_meta WHERE key = ?`)
      .get(LOCAL_DEVICE_ID_KEY) as { value: string } | undefined
    if (!deviceId?.value) {
      db.close()
      return null
    }
    const device = db
      .prepare(`SELECT user_id FROM devices WHERE device_id = ?`)
      .get(deviceId.value) as { user_id: string } | undefined
    db.close()
    return device?.user_id ?? null
  } catch {
    return null
  }
}

function rewriteFilePathsAfterProfileMove(db: Database, oldRoot: string, newRoot: string): void {
  const rows = db
    .prepare(`SELECT file_id, storage_path, preview_path FROM files WHERE is_bookmark = 0`)
    .all() as { file_id: string; storage_path: string; preview_path: string | null }[]
  const now = new Date().toISOString()
  for (const row of rows) {
    let storage = row.storage_path
    let preview = row.preview_path
    let changed = false
    if (storage.startsWith(oldRoot)) {
      storage = join(newRoot, storage.slice(oldRoot.length).replace(/^\//, ''))
      changed = true
    }
    if (preview?.startsWith(oldRoot)) {
      preview = join(newRoot, preview.slice(oldRoot.length).replace(/^\//, ''))
      changed = true
    }
    if (!changed) continue
    db.prepare(
      `UPDATE files SET storage_path = ?, preview_path = ?, updated_at = ? WHERE file_id = ?`
    ).run(storage, preview, now, row.file_id)
  }
}

function migrateLegacyToProfile(userId: string): void {
  const base = getRootUserDataPath()
  const profileDir = join(base, 'profiles', userId)
  mkdirSync(profileDir, { recursive: true })
  for (const name of ['lanpm.db', 'files', 'previews'] as const) {
    const from = join(base, name)
    const to = join(profileDir, name)
    if (existsSync(from) && !existsSync(to)) {
      renameSync(from, to)
    }
  }
  const profileDb = join(profileDir, 'lanpm.db')
  if (existsSync(profileDb)) {
    const db = new DatabaseConstructor(profileDb)
    rewriteFilePathsAfterProfileMove(db, join(base, 'files'), join(profileDir, 'files'))
    rewriteFilePathsAfterProfileMove(db, join(base, 'previews'), join(profileDir, 'previews'))
    db.close()
  }
  writeActiveUserId(userId)
}

/** 在 initDatabase 之前调用 */
export function ensureProfileUserDataPath(): void {
  rootUserDataPath = app.getPath('userData')
  let userId = readActiveUserId()
  const legacyDb = join(rootUserDataPath, 'lanpm.db')

  if (!userId) {
    userId = resolveUserIdFromLegacyDb(legacyDb)
    if (userId) migrateLegacyToProfile(userId)
  }

  if (userId) {
    const profileDir = join(rootUserDataPath, 'profiles', userId)
    mkdirSync(profileDir, { recursive: true })
    app.setPath('userData', profileDir)
  }
}

export function bindProfileAfterSetup(userId: string): void {
  migrateLegacyToProfile(userId)
  const profileDir = join(getRootUserDataPath(), 'profiles', userId)
  mkdirSync(profileDir, { recursive: true })
  app.setPath('userData', profileDir)
}

export function clearActiveProfileBinding(): void {
  const path = activeProfilePath()
  if (existsSync(path)) unlinkSync(path)
}
