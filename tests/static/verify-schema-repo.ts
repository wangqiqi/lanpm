/**
 * AUTO-06 — schema.sql 表清单与 verify-storage 期望一致。
 * Run: npm run verify:schema-repo
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')
const storageVerify = readFileSync(join(root, 'tests/integration/verify-storage.mjs'), 'utf8')

const tables = [...schemaSql.matchAll(/CREATE TABLE\s+(\w+)/gi)].map((m) => m[1]!)
const expectedMatch = storageVerify.match(/EXPECTED_TABLES\s*=\s*\[([\s\S]*?)\]/)
assert.ok(expectedMatch, 'EXPECTED_TABLES not found in verify-storage.mjs')

const expected = [...expectedMatch[1]!.matchAll(/['"](\w+)['"]/g)].map((m) => m[1]!)

for (const t of expected) {
  assert.ok(tables.includes(t), `schema.sql missing table from verify-storage: ${t}`)
}

const extras = tables.filter((t) => !expected.includes(t))
assert.ok(extras.length === 0, `schema.sql has undocumented tables: ${extras.join(', ')}`)

console.log(`verify:schema-repo OK (${expected.length} tables aligned)`)
