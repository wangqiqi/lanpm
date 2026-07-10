/**
 * TASK-149 — listRecalledMessagesInGroup 须用 json_extract，禁止 LIKE 假阳性路径。
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

describe('listRecalledMessagesInGroup source', () => {
  it('filters with json_extract, not content_json LIKE', () => {
    const src = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../../src/main/storage/repositories/messageRepository.ts'
      ),
      'utf8'
    )
    const start = src.indexOf('function listRecalledMessagesInGroup')
    expect(start).toBeGreaterThanOrEqual(0)
    const fn = src.slice(start, start + 800)
    expect(fn).toMatch(/json_extract\(content_json/)
    expect(fn).not.toMatch(/LIKE\s+'%"kind":"recalled"%'/)
  })
})
