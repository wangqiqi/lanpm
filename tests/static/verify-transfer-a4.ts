/**
 * TASK-275 — A4 transfer UX: cancel · retry · rate/ETA · progress push wiring.
 * Run: npm run verify:transfer-a4
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import {
  canCancelTransfer,
  canRetryTransfer,
  estimateBytesPerSecond
} from '../../src/shared/file/transferControl.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.equal(canCancelTransfer('transferring'), true)
assert.equal(canRetryTransfer('cancelled', 'download', 10), true)
assert.equal(
  estimateBytesPerSecond([
    { t: 0, bytes: 0 },
    { t: 1000, bytes: 50_000 }
  ]),
  50_000
)

assert.ok(existsSync(join(root, 'src/shared/file/transferControl.ts')))

const channels = readFileSync(join(root, 'src/shared/file/channels.ts'), 'utf8')
assert.match(channels, /cancelTransfer:\s*'file:cancelTransfer'/)
assert.match(channels, /FILE_TRANSFER_PUSH_CHANNEL/)

const api = readFileSync(join(root, 'src/shared/lanpm-api.ts'), 'utf8')
assert.match(api, /cancelTransfer:/)

const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preload, /cancelTransfer:/)
assert.match(preload, /FILE_TRANSFER_PUSH_CHANNEL/)

const ipc = readFileSync(join(root, 'src/main/ipc/file.ts'), 'utf8')
assert.match(ipc, /FILE_IPC\.cancelTransfer/)
assert.match(ipc, /cancelTransfer\(/)

const fileService = readFileSync(join(root, 'src/main/file/fileService.ts'), 'utf8')
assert.match(fileService, /export function cancelTransfer/)
assert.match(fileService, /cancelRequested/)
assert.match(fileService, /status === 'cancelled'/)

const sync = readFileSync(join(root, 'src/main/file/fileSyncService.ts'), 'utf8')
assert.match(sync, /export function cancelPullByTransferId/)
assert.match(sync, /'cancelled'/)

const store = readFileSync(join(root, 'src/renderer/src/stores/fileStore.ts'), 'utf8')
assert.match(store, /cancelTransfer:/)

const filesView = readFileSync(
  join(root, 'src/renderer/src/features/files/FilesView.tsx'),
  'utf8'
)
assert.match(filesView, /TransferActiveRow/)
assert.match(filesView, /handleCancel/)
assert.match(filesView, /files\.transferRetry/)
assert.match(filesView, /files\.transferCancel/)

const rateHint = readFileSync(
  join(root, 'src/renderer/src/features/files/useTransferRateHint.ts'),
  'utf8'
)
assert.match(rateHint, /estimateBytesPerSecond/)
assert.match(rateHint, /formatEtaSeconds/)

const stub = readFileSync(
  join(root, 'src/renderer/src/platform/browserLanpmStub.ts'),
  'utf8'
)
assert.match(stub, /cancelTransfer:/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:transfer-a4'], 'missing verify:transfer-a4')

const roadmap = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(roadmap, /verify:transfer-a4/)

console.log('verify:transfer-a4 OK (cancel · retry · rate/ETA · push wiring)')
