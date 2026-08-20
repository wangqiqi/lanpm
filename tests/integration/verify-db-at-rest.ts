/**
 * SQLite at-rest: plaintext open, encrypt, wrong passphrase, missing passphrase.
 * Run: npm run verify:db-at-rest
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { projectRoot } from '../projectRoot.ts'
import { mkLanpmTemp, rmLanpmTemp } from '../lanpmTemp.ts'
import {
  encryptExistingPlainDatabase,
  openSqliteDatabase,
  probeSqliteAtRest
} from '../../src/main/storage/sqliteAtRest.ts'
import { applyMigrations } from '../../src/main/storage/migrate.ts'

const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>
}
assert.match(
  pkg.dependencies['better-sqlite3'] ?? '',
  /better-sqlite3-multiple-ciphers/,
  'better-sqlite3 must alias better-sqlite3-multiple-ciphers'
)

const atRestSrc = readFileSync(join(projectRoot, 'src/main/storage/sqliteAtRest.ts'), 'utf8')
assert.match(atRestSrc, /SQLITE_AT_REST_CIPHER = 'sqlcipher'/, 'must pin SQLCipher cipher')
assert.doesNotMatch(atRestSrc, /console\.(log|info|debug|warn).*passphrase/, 'must not log passphrase')

const unlockSrc = readFileSync(join(projectRoot, 'src/main/storage/unlockPassphrase.ts'), 'utf8')
assert.match(unlockSrc, /contextIsolation:\s*true/, 'unlock window must isolate context')
assert.match(unlockSrc, /nodeIntegration:\s*false/, 'unlock window must not enable nodeIntegration')
assert.match(unlockSrc, /let settled = false/, 'unlock finish must settle once')
assert.doesNotMatch(unlockSrc, /require\(['"]electron['"]\)/, 'unlock HTML must not require electron')

const profileSrc = readFileSync(join(projectRoot, 'src/main/storage/profilePaths.ts'), 'utf8')
assert.match(profileSrc, /openPlainSqliteDatabase/, 'profile migrate must probe before open')
assert.doesNotMatch(
  profileSrc,
  /new DatabaseConstructor\(/,
  'profilePaths must not unkeyed-open lanpm.db'
)

const databaseSrc = readFileSync(join(projectRoot, 'src/main/storage/database.ts'), 'utf8')
assert.match(
  databaseSrc,
  /export function closeDatabase\(\)[\s\S]*sessionPassphrase = undefined/,
  'closeDatabase must clear sessionPassphrase'
)

const indexSrc = readFileSync(join(projectRoot, 'src/main/index.ts'), 'utf8')
const cliSrc = readFileSync(join(projectRoot, 'src/cli/main.ts'), 'utf8')
assert.match(indexSrc, /resolveDbPassphrase\(\{ kind: dbKind, allowPrompt: true \}\)/)
assert.match(cliSrc, /resolveDbPassphrase\(\{ kind, allowPrompt: false \}\)/)

const dir = mkLanpmTemp('lanpm-at-rest-')
const dbPath = join(dir, 'lanpm.db')
const passphrase = 'correct-horse-battery'

try {
  const plain = new Database(dbPath)
  applyMigrations(plain)
  plain.prepare(`INSERT INTO sync_meta (key, value) VALUES (?, ?)`).run('at_rest_probe', 'plain-ok')
  plain.close()
  assert.equal(probeSqliteAtRest(dbPath), 'plain')

  const reopened = openSqliteDatabase(dbPath)
  const row = reopened.prepare('SELECT value FROM sync_meta WHERE key = ?').get('at_rest_probe') as {
    value: string
  }
  assert.equal(row.value, 'plain-ok')
  reopened.close()

  encryptExistingPlainDatabase(dbPath, passphrase)
  assert.equal(probeSqliteAtRest(dbPath), 'encrypted')

  try {
    openSqliteDatabase(dbPath)
    throw new Error('expected passphrase required')
  } catch (err) {
    assert.equal((err as Error).message, 'err.dbPassphraseRequired')
  }

  try {
    openSqliteDatabase(dbPath, 'wrong-pass-word')
    throw new Error('expected wrong passphrase')
  } catch (err) {
    assert.equal((err as Error).message, 'err.dbWrongPassphrase')
  }

  const unlocked = openSqliteDatabase(dbPath, passphrase)
  const again = unlocked.prepare('SELECT value FROM sync_meta WHERE key = ?').get('at_rest_probe') as {
    value: string
  }
  assert.equal(again.value, 'plain-ok')
  unlocked.close()
  console.log('verify:db-at-rest OK')
} finally {
  rmLanpmTemp(dir)
}
