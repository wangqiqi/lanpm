/**
 * SPRINT-23 — mindmap documents IPC + MindmapView toolbar.
 * Run: npm run verify:mindmap
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { MINDMAP_IPC } from '../../src/shared/mindmap/channels.ts'
import { emptyMindmapDataJson, mindmapFileName } from '../../src/shared/mindmap/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

assert.equal(MINDMAP_IPC.list, 'mindmap:list')
assert.equal(MINDMAP_IPC.create, 'mindmap:create')
assert.ok(emptyMindmapDataJson('Test').includes('nodeData'))
assert.match(mindmapFileName('My Map'), /\.lanpm-mindmap\.json$/)

const schemaSql = readFileSync(join(root, 'src/main/storage/schema.sql'), 'utf8')
assert.match(schemaSql, /CREATE TABLE mindmap_documents/)

const ipcSrc = readFileSync(join(root, 'src/main/ipc/mindmap.ts'), 'utf8')
assert.match(ipcSrc, /MINDMAP_IPC\.getDocState/)

const viewSrc = readFileSync(join(root, 'src/renderer/src/plugin/builtins/MindmapView.tsx'), 'utf8')
assert.match(viewSrc, /useMindmapDocumentStore/)
assert.doesNotMatch(viewSrc, /invokeCapability\(plugin\.id, 'task\.list'/)

const toolbarPath = join(root, 'src/renderer/src/plugin/builtins/MindmapToolbar.tsx')
assert.ok(existsSync(toolbarPath))
const toolbarSrc = readFileSync(toolbarPath, 'utf8')
assert.match(toolbarSrc, /mindmap-toolbar/)

const registrySrc = readFileSync(join(root, 'src/renderer/src/plugin/registry.ts'), 'utf8')
assert.match(registrySrc, /lanpm\.mindmap.*MindmapSlot/)

console.log('verify:mindmap OK')
