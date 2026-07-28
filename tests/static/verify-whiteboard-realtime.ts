/**
 * TASK-263 — whiteboard realtime collab wiring.
 * Run: npm run verify:whiteboard-realtime
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import {
  isWhiteboardCrdtPayload,
  whiteboardCrdtDocId
} from '../../src/shared/whiteboard/whiteboardCrdt.ts'
import { isWhiteboardAwarenessPayload } from '../../src/shared/whiteboard/whiteboardAwareness.ts'
import {
  createEmptyWhiteboardDoc,
  seedWhiteboardDocFromSceneJson,
  whiteboardDocToSceneJson,
  WHITEBOARD_MAX_ASSET_CHARS
} from '../../src/shared/whiteboard/whiteboardCrdtModel.ts'
import { emptyWhiteboardSceneJson } from '../../src/shared/whiteboard/types.ts'
import { WHITEBOARD_IPC } from '../../src/shared/whiteboard/channels.ts'
import { assertPublishableSyncType } from '../../src/shared/network/unimplementedSync.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.equal(whiteboardCrdtDocId('g1'), 'whiteboard:g1')
assert.ok(
  isWhiteboardCrdtPayload({
    docId: 'whiteboard:g1',
    updateBase64: Buffer.from([1, 2, 3]).toString('base64')
  })
)
assert.ok(
  isWhiteboardAwarenessPayload({
    docId: 'whiteboard:g1',
    updateBase64: Buffer.from([1]).toString('base64')
  })
)
assert.doesNotThrow(() => assertPublishableSyncType('whiteboard_crdt'))
assert.doesNotThrow(() => assertPublishableSyncType('whiteboard_awareness'))

const doc = createEmptyWhiteboardDoc()
seedWhiteboardDocFromSceneJson(
  doc,
  JSON.stringify({
    type: 'excalidraw',
    version: 2,
    elements: [{ id: 'e1', type: 'rectangle', version: 1, x: 0, y: 0 }],
    appState: {},
    files: {}
  })
)
const scene = whiteboardDocToSceneJson(doc)
assert.match(scene, /e1/)
assert.ok(WHITEBOARD_MAX_ASSET_CHARS > 0)
assert.ok(emptyWhiteboardSceneJson().includes('excalidraw'))

assert.equal(WHITEBOARD_IPC.getDocState, 'whiteboard:getDocState')
assert.equal(WHITEBOARD_IPC.publishUpdate, 'whiteboard:publishUpdate')
assert.equal(WHITEBOARD_IPC.remoteUpdate, 'whiteboard:remoteUpdate')

for (const rel of [
  'src/shared/whiteboard/whiteboardCrdt.ts',
  'src/shared/whiteboard/whiteboardAwareness.ts',
  'src/shared/whiteboard/whiteboardCrdtModel.ts',
  'src/main/storage/repositories/whiteboardCrdtRepository.ts',
  'src/main/whiteboard/whiteboardCrdtService.ts',
  'src/main/whiteboard/whiteboardCrdtOfflineSyncService.ts',
  'src/main/whiteboard/whiteboardAwarenessService.ts',
  'src/main/whiteboard/whiteboardSyncService.ts',
  'src/renderer/src/features/whiteboard/WhiteboardView.tsx'
]) {
  assert.ok(existsSync(join(root, rel)), `missing ${rel}`)
}

const view = readFileSync(
  join(root, 'src/renderer/src/features/whiteboard/WhiteboardView.tsx'),
  'utf8'
)
assert.match(view, /ExcalidrawBinding/)
assert.match(view, /@mizuka-wu\/y-excalidraw/)
assert.match(view, /onPointerUpdate/)

const schemaTs = readFileSync(join(root, 'src/main/storage/schema.ts'), 'utf8')
assert.match(schemaTs, /SCHEMA_VERSION\s*=\s*11/)
assert.match(schemaTs, /whiteboard_crdt_docs/)

const types = readFileSync(join(root, 'src/shared/network/types.ts'), 'utf8')
assert.match(types, /whiteboard_crdt/)
assert.match(types, /whiteboard_awareness/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}
assert.ok(
  pkg.dependencies?.['@mizuka-wu/y-excalidraw'] ||
    pkg.devDependencies?.['@mizuka-wu/y-excalidraw'],
  'y-excalidraw dependency required'
)
assert.ok(pkg.scripts?.['verify:whiteboard-realtime'], 'missing verify:whiteboard-realtime')

const feige = readFileSync(join(root, 'docs/飞鸽飞秋.md'), 'utf8')
assert.match(feige, /verify:whiteboard-realtime|whiteboard_crdt/)

console.log(
  'verify:whiteboard-realtime OK (contract · schema v10 · Binding · sync types · docs)'
)
