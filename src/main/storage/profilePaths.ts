import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, renameSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Database } from 'better-sqlite3'
import { readRebindHint } from '../identity/rebindHint'
import { LOCAL_DEVICE_ID_KEY } from '../identity/setup'
import { openPlainSqliteDatabase } from './sqliteAtRest.ts'
import type { UserProfile } from './types'
import { getUserById } from './repositories/userRepository'

const ACTIVE_PROFILE_FILE = 'active_profile.json'

interface ActiveProfileFile {
  userId: string
}

let rootUserDataPath: string | null = null

export function getRootUserDataPath(): string {
  const envRoot = process.env.LANPM_USER_DATA?.trim()
  if (envRoot) return envRoot
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
    const db = openPlainSqliteDatabase(legacyDbPath, { readonly: true })
    if (!db) return null
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

function hasTable(db: Database, table: string): boolean {
  const row = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table) as { 1: number } | undefined
  return row != null
}

/** 迁移中断后 profiles/<id>/lanpm.db 已存在但 active_profile.json 未写入 */
function discoverUserIdFromExistingProfiles(): string | null {
  const profilesRoot = join(getRootUserDataPath(), 'profiles')
  if (!existsSync(profilesRoot)) return null
  const withDb = readdirSync(profilesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((id) => existsSync(join(profilesRoot, id, 'lanpm.db')))
  return withDb.length === 1 ? withDb[0]! : null
}

function rewriteFilePathsAfterProfileMove(db: Database, oldRoot: string, newRoot: string): void {
  if (!hasTable(db, 'files')) return
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

function moveSqliteBundle(fromDir: string, toDir: string): void {
  for (const suffix of ['', '-wal', '-shm'] as const) {
    const name = `lanpm.db${suffix}`
    const from = join(fromDir, name)
    const to = join(toDir, name)
    if (existsSync(from) && !existsSync(to)) {
      renameSync(from, to)
    }
  }
}

/** 须在主进程 closeDatabase() 之后调用（Windows 上打开中的 db 无法 rename） */
function migrateLegacyToProfile(userId: string): void {
  const base = getRootUserDataPath()
  const profileDir = join(base, 'profiles', userId)
  mkdirSync(profileDir, { recursive: true })
  moveSqliteBundle(base, profileDir)
  for (const name of ['files', 'previews'] as const) {
    const from = join(base, name)
    const to = join(profileDir, name)
    if (existsSync(from) && !existsSync(to)) {
      renameSync(from, to)
    }
  }
  const profileDb = join(profileDir, 'lanpm.db')
  const db = openPlainSqliteDatabase(profileDb)
  if (db) {
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

  if (!userId) {
    userId = discoverUserIdFromExistingProfiles()
    if (userId) writeActiveUserId(userId)
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

/** 新建身份：在独立空 profile 目录上跑 Setup（不写 active_profile，由 bind 收尾） */
export function prepareFreshProfileUserDataShell(): string {
  const base = getRootUserDataPath()
  const shellId = `_new_${Date.now().toString(36)}`
  const profileDir = join(base, 'profiles', shellId)
  mkdirSync(profileDir, { recursive: true })
  app.setPath('userData', profileDir)
  return profileDir
}

export function readUserProfileInProfileDir(userId: string): UserProfile | null {
  const dbPath = join(getRootUserDataPath(), 'profiles', userId, 'lanpm.db')
  const db = openPlainSqliteDatabase(dbPath, { readonly: true })
  if (!db) return null
  try {
    return getUserById(db, userId)
  } finally {
    db.close()
  }
}

export function getPendingRebindFromDisk(): {
  userId: string
  deviceId: string
  user: UserProfile
} | null {
  const hint = readRebindHint(getRootUserDataPath())
  if (!hint) return null
  const user = readUserProfileInProfileDir(hint.userId)
  if (!user) return null
  return { userId: hint.userId, deviceId: hint.deviceId, user }
}
