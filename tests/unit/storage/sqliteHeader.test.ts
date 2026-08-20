import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { probeSqliteAtRest } from '../../../src/main/storage/sqliteAtRest.ts'

const dirs: string[] = []

afterEach(() => {
  dirs.length = 0
})

describe('probeSqliteAtRest', () => {
  it('reports missing when the file does not exist', () => {
    expect(probeSqliteAtRest(join(tmpdir(), `lanpm-no-db-${Date.now()}.db`))).toBe('missing')
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
