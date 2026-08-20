import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const repo = readFileSync(join(root, 'src/main/storage/repositories/fileRepository.ts'), 'utf8')

describe('listFileMetaSince source (TASK-4802)', () => {
  it('pages non-bookmark rows by updated_at exclusive since + min cutoff', () => {
    expect(repo).toMatch(/export function listFileMetaSince/)
    expect(repo).toMatch(/is_bookmark = 0/)
    expect(repo).toMatch(/updated_at > \?/)
    expect(repo).toMatch(/updated_at >= \?/)
    expect(repo).toMatch(/ORDER BY updated_at ASC/)
    expect(repo).toMatch(/export function getMaxFileMetaUpdatedAt/)
  })
})
