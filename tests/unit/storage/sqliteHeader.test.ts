import { mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { afterEach, describe, expect, it } from 'vitest'
import { openPlainSqliteDatabase, probeSqliteAtRest } from '../../../src/main/storage/sqliteAtRest.ts'

const srcPath = join(dirname(fileURLToPath(import.meta.url)), '../../../src/main/storage/sqliteAtRest.ts')

const dirs: string[] = []

afterEach(() => {
  dirs.length = 0
})

describe('probeSqliteAtRest', () => {
  it('reads only the 16-byte header (no whole-file readFileSync)', () => {
    const src = readFileSync(srcPath, 'utf8')
    const probe = src.slice(
      src.indexOf('export function probeSqliteAtRest'),
      src.indexOf('export function assertPassphrase')
    )
    expect(probe).toMatch(/readSync\(/)
    expect(probe).not.toMatch(/readFileSync/)
  })

  it('reports missing when the file does not exist', () => {
    expect(probeSqliteAtRest(join(tmpdir(), `lanpm-no-db-${Date.now()}.db`))).toBe('missing')
  })

  it('reports encrypted when the file is shorter than the SQLite header', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lanpm-at-rest-'))
    dirs.push(dir)
    const path = join(dir, 'lanpm.db')
    writeFileSync(path, Buffer.from('SQLite'))
    expect(probeSqliteAtRest(path)).toBe('encrypted')
  })

  it('reports plain when the SQLite header is present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lanpm-at-rest-'))
    dirs.push(dir)
    const path = join(dir, 'lanpm.db')
    const header = Buffer.concat([Buffer.from('SQLite format 3\0'), Buffer.alloc(8)])
    writeFileSync(path, header)
    expect(probeSqliteAtRest(path)).toBe('plain')
  })

  it('reports encrypted when the header is not SQLite', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lanpm-at-rest-'))
    dirs.push(dir)
    const path = join(dir, 'lanpm.db')
    writeFileSync(path, Buffer.from('not-a-sqlite-header-xxxx'))
    expect(probeSqliteAtRest(path)).toBe('encrypted')
  })
})

describe('openPlainSqliteDatabase', () => {
  it('returns null for encrypted files without opening them', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lanpm-at-rest-'))
    dirs.push(dir)
    const path = join(dir, 'lanpm.db')
    writeFileSync(path, Buffer.from('not-a-sqlite-header-xxxx'))
    expect(openPlainSqliteDatabase(path)).toBeNull()
  })

  it('returns null when the file is missing', () => {
    expect(openPlainSqliteDatabase(join(tmpdir(), `lanpm-no-db-${Date.now()}.db`))).toBeNull()
  })
})
