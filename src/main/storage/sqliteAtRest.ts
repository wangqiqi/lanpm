import { copyFileSync, existsSync, readFileSync, renameSync, unlinkSync } from 'fs'
import Database from 'better-sqlite3'
import { throwLanpm } from '../../shared/errors/lanpmError.ts'

type CipherDatabase = Database.Database & {
  key: (key: Buffer) => number
  rekey: (key: Buffer) => number
}

export const SQLITE_AT_REST_CIPHER = 'sqlcipher'
export const SQLITE_AT_REST_MIN_PASSPHRASE = 8
const SQLITE_AT_REST_BACKUP_SUFFIX = '.pre-encrypt.bak'

const SQLITE_HEADER = Buffer.from('SQLite format 3\0', 'utf8')

export type SqliteAtRestKind = 'missing' | 'plain' | 'encrypted'

export function probeSqliteAtRest(dbPath: string): SqliteAtRestKind {
  if (!existsSync(dbPath)) return 'missing'
  const buf = readFileSync(dbPath)
  if (buf.length >= 16 && buf.subarray(0, 16).equals(SQLITE_HEADER)) return 'plain'
  return 'encrypted'
}

export function assertPassphrase(passphrase: string): void {
  if (typeof passphrase !== 'string' || passphrase.length < SQLITE_AT_REST_MIN_PASSPHRASE) {
    throwLanpm('err.dbPassphraseTooShort')
  }
}

function sidecarPaths(dbPath: string): string[] {
  return [`${dbPath}-wal`, `${dbPath}-shm`]
}

function asCipherDb(db: Database.Database): CipherDatabase {
  return db as CipherDatabase
}

function applyCipherAndKey(db: Database.Database, passphrase: string): void {
  db.pragma(`cipher='${SQLITE_AT_REST_CIPHER}'`)
  asCipherDb(db).key(Buffer.from(passphrase, 'utf8'))
}

export function assertDatabaseReadable(db: Database.Database): void {
  try {
    const row = db
      .prepare(`SELECT count(*) AS c FROM sqlite_master WHERE type = 'table'`)
      .get() as { c: number }
    if (!row || row.c < 1) {
      throwLanpm('err.dbWrongPassphrase')
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'err.dbWrongPassphrase') throw err
    throwLanpm('err.dbWrongPassphrase')
  }
}

/** Open only if the file is plaintext SQLite. Encrypted/missing → null (never unkeyed open). */
export function openPlainSqliteDatabase(
  dbPath: string,
  options?: { readonly?: boolean }
): Database.Database | null {
  if (probeSqliteAtRest(dbPath) !== 'plain') return null
  return new Database(dbPath, options)
}

export function openSqliteDatabase(dbPath: string, passphrase?: string): Database.Database {
  const kind = probeSqliteAtRest(dbPath)
  if (kind === 'encrypted' && !passphrase) {
    throwLanpm('err.dbPassphraseRequired')
  }
  const db = new Database(dbPath)
  if (kind === 'encrypted') {
    assertPassphrase(passphrase!)
    try {
      applyCipherAndKey(db, passphrase!)
      assertDatabaseReadable(db)
    } catch (err) {
      db.close()
      throw err
    }
  }
  return db
}

function restoreBackup(dbPath: string, backupPath: string): void {
  if (!existsSync(backupPath)) return
  if (existsSync(dbPath)) unlinkSync(dbPath)
  renameSync(backupPath, dbPath)
}

/**
 * Encrypt an existing plaintext SQLite file in place. Caller must close other handles first.
 * Keeps `*.pre-encrypt.bak` until the encrypted file reopens successfully.
 */
export function encryptExistingPlainDatabase(dbPath: string, passphrase: string): void {
  assertPassphrase(passphrase)
  if (probeSqliteAtRest(dbPath) !== 'plain') {
    throwLanpm('err.dbEncryptNotPlain')
  }
  const backupPath = `${dbPath}${SQLITE_AT_REST_BACKUP_SUFFIX}`
  copyFileSync(dbPath, backupPath)
  let db: Database.Database | null = null
  try {
    db = new Database(dbPath)
    db.pragma('wal_checkpoint(TRUNCATE)')
    db.pragma('journal_mode = DELETE')
    db.pragma(`cipher='${SQLITE_AT_REST_CIPHER}'`)
    asCipherDb(db).rekey(Buffer.from(passphrase, 'utf8'))
    assertDatabaseReadable(db)
    db.close()
    db = null
    for (const side of sidecarPaths(dbPath)) {
      if (existsSync(side)) unlinkSync(side)
    }
    const verify = openSqliteDatabase(dbPath, passphrase)
    verify.close()
    unlinkSync(backupPath)
  } catch (err) {
    if (db) {
      try {
        db.close()
      } catch {
        /* ignore */
      }
    }
    restoreBackup(dbPath, backupPath)
    throw err
  }
}
