/**
 * TASK-152 — listReadReceiptsSince 须按 since/min + LIMIT 结构化查询。
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

describe('listReadReceiptsSince source (TASK-152)', () => {
  it('queries by group_id, since/min read_at, and LIMIT', () => {
    const src = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../../src/main/storage/repositories/readReceiptRepository.ts'
      ),
      'utf8'
    )
    const start = src.indexOf('function listReadReceiptsSince')
    expect(start).toBeGreaterThanOrEqual(0)
    const fn = src.slice(start, start + 900)
    expect(fn).toMatch(/read_at > \?/)
    expect(fn).toMatch(/read_at >= \?/)
    expect(fn).toMatch(/group_id = \?/)
    expect(fn).toMatch(/LIMIT \?/)
    expect(fn).toMatch(/ORDER BY read_at ASC/)
  })

  it('exports getMaxReadAtInGroup for sync cursor', () => {
    const src = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../../src/main/storage/repositories/readReceiptRepository.ts'
      ),
      'utf8'
    )
    expect(src).toMatch(/function getMaxReadAtInGroup/)
  })
})
