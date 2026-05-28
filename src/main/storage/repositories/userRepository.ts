import type { Database } from 'better-sqlite3'
import type { UserProfile } from '../types'

interface UserRow {
  user_id: string
  display_name: string
  base_name: string
  suffix: string | null
  department: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

function rowToProfile(row: UserRow): UserProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    baseName: row.base_name,
    suffix: row.suffix ?? undefined,
    department: row.department ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function upsertUser(db: Database, profile: UserProfile): void {
  db.prepare(
    `INSERT INTO users (
      user_id, display_name, base_name, suffix, department, avatar_url, created_at, updated_at
    ) VALUES (
      @userId, @displayName, @baseName, @suffix, @department, @avatarUrl, @createdAt, @updatedAt
    )
    ON CONFLICT(user_id) DO UPDATE SET
      display_name = excluded.display_name,
      base_name = excluded.base_name,
      suffix = excluded.suffix,
      department = excluded.department,
      avatar_url = excluded.avatar_url,
      updated_at = excluded.updated_at`
  ).run({
    userId: profile.userId,
    displayName: profile.displayName,
    baseName: profile.baseName,
    suffix: profile.suffix ?? null,
    department: profile.department ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  })
}

export function getUserById(db: Database, userId: string): UserProfile | null {
  const row = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as UserRow | undefined
  return row ? rowToProfile(row) : null
}

export function getFirstUser(db: Database): UserProfile | null {
  const row = db
    .prepare('SELECT * FROM users ORDER BY created_at ASC LIMIT 1')
    .get() as UserRow | undefined
  return row ? rowToProfile(row) : null
}

export function userIdExists(db: Database, userId: string): boolean {
  const row = db.prepare('SELECT 1 FROM users WHERE user_id = ?').get(userId)
  return row !== undefined
}

export function baseNameExists(db: Database, baseName: string): boolean {
  const row = db.prepare('SELECT 1 FROM users WHERE base_name = ?').get(baseName)
  return row !== undefined
}
