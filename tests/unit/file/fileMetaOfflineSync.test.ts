import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('file meta offline sync wiring (TASK-4803)', () => {
  it('reconnect request + batch handlers are mounted on file sync', () => {
    const service = readFileSync(
      join(root, 'src/main/file/fileMetaOfflineSyncService.ts'),
      'utf8'
    )
    const sync = readFileSync(join(root, 'src/main/file/fileSyncService.ts'), 'utf8')
    expect(service).toMatch(/requestFileMetaOfflineSync/)
    expect(service).toMatch(/handleFileMetaSyncRequest/)
    expect(service).toMatch(/handleFileMetaSyncBatch/)
    expect(service).toMatch(/toFileMetaSyncWire/)
    expect(sync).toMatch(/requestFileMetaOfflineSync/)
    expect(sync).toMatch(/file_meta_sync_request/)
    expect(sync).toMatch(/file_meta_sync_batch/)
  })
})
