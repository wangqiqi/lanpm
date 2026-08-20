/**
 * SPRINT-26 — mindmap realtime CRDT wiring.
 * Run: npm run verify:mindmap-realtime
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import {
  isMindmapCrdtPayload,
  mindmapCrdtDocId
} from '../../src/shared/mindmap/mindmapCrdt.ts'
import { isMindmapAwarenessPayload } from '../../src/shared/mindmap/mindmapAwareness.ts'
import {
  applyMindmapEncodedUpdate,
  createEmptyMindmapDoc,
  encodeMindmapDocState,
  encodeMindmapDocStateAsUpdate,
  encodeMindmapDocStateVector,
  mindmapDocToDataJson,
  seedMindmapDocFromJson
} from '../../src/shared/mindmap/mindmapCrdtModel.ts'
import { emptyMindmapDataJson } from '../../src/shared/mindmap/types.ts'
import { MINDMAP_IPC } from '../../src/shared/mindmap/channels.ts'
import { assertPublishableSyncType } from '../../src/shared/network/unimplementedSync.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.equal(mindmapCrdtDocId('mmap_1'), 'mindmap:mmap_1')
assert.ok(
  isMindmapCrdtPayload({
    docId: 'mindmap:mmap_1',
    updateBase64: Buffer.from([1, 2, 3]).toString('base64')
  })
)
assert.ok(
  isMindmapAwarenessPayload({
    docId: 'mindmap:mmap_1',
    updateBase64: Buffer.from([1]).toString('base64')
  })
)
assert.doesNotThrow(() => assertPublishableSyncType('mindmap_crdt'))
assert.doesNotThrow(() => assertPublishableSyncType('mindmap_awareness'))
assert.doesNotThrow(() => assertPublishableSyncType('mindmap_crdt_sync_request'))
assert.doesNotThrow(() => assertPublishableSyncType('mindmap_crdt_sync_batch'))

const json = emptyMindmapDataJson('Root')
const parsed = JSON.parse(json) as { nodeData: { children: unknown[] } }
parsed.nodeData.children = [{ id: 'c1', topic: 'A', children: [] }]
const seeded = JSON.stringify(parsed)
const doc = createEmptyMindmapDoc()
seedMindmapDocFromJson(doc, seeded)
assert.match(mindmapDocToDataJson(doc), /c1/)

const a = createEmptyMindmapDoc()
const b = createEmptyMindmapDoc()
seedMindmapDocFromJson(a, seeded, 'seed')
applyMindmapEncodedUpdate(b, encodeMindmapDocState(a), 'remote')
assert.match(mindmapDocToDataJson(b), /c1/)
const sv = encodeMindmapDocStateVector(b)
const diff = encodeMindmapDocStateAsUpdate(a, sv)
assert.ok(diff.byteLength >= 0)

assert.equal(MINDMAP_IPC.getDocState, 'mindmap:getDocState')
assert.equal(MINDMAP_IPC.publishUpdate, 'mindmap:publishUpdate')
assert.equal(MINDMAP_IPC.remoteUpdate, 'mindmap:remoteUpdate')

for (const rel of [
  'src/shared/mindmap/mindmapCrdt.ts',
  'src/shared/mindmap/mindmapAwareness.ts',
  'src/shared/mindmap/mindmapCrdtModel.ts',
  'src/main/storage/repositories/mindmapCrdtRepository.ts',
  'src/main/mindmap/mindmapCrdtService.ts',
  'src/main/mindmap/mindmapCrdtOfflineSyncService.ts',
  'src/main/mindmap/mindmapAwarenessService.ts',
  'src/main/mindmap/mindmapSyncService.ts',
  'src/renderer/src/plugin/builtins/MindmapView.tsx'
]) {
  assert.ok(existsSync(join(root, rel)), `missing ${rel}`)
}

const view = readFileSync(join(root, 'src/renderer/src/plugin/builtins/MindmapView.tsx'), 'utf8')
assert.match(view, /getDocState/)
assert.match(view, /publishUpdate/)
assert.match(view, /onRemoteUpdate/)
assert.match(view, /Awareness/)

const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')
assert.match(schemaSql, /CREATE TABLE mindmap_crdt_docs/)
const schemaTs = readFileSync(join(root, 'src/main/storage/schema.ts'), 'utf8')
assert.match(schemaTs, /mindmap_crdt_docs/)

const types = readFileSync(join(root, 'src/shared/network/types.ts'), 'utf8')
assert.match(types, /mindmap_crdt/)
assert.match(types, /mindmap_awareness/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:mindmap-realtime'])

console.log('verify:mindmap-realtime OK')
