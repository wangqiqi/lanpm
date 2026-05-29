/**
 * 顶栏「发现」：DiscoverModal + discover:snapshot + group:join IPC。
 * Run: npm run verify:discover
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const topbar = readFileSync(join(root, 'src/renderer/src/layout/TopBar.tsx'), 'utf8')
const modal = readFileSync(join(root, 'src/renderer/src/features/discover/DiscoverModal.tsx'), 'utf8')
const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
const discoverIpc = readFileSync(join(root, 'src/main/ipc/discover.ts'), 'utf8')
const groupService = readFileSync(join(root, 'src/main/group/groupService.ts'), 'utf8')

assert.match(topbar, /DiscoverModal/)
assert.match(topbar, /topbar\.discover/)
assert.match(modal, /discover\.snapshot/)
assert.match(modal, /openSession/)
assert.match(modal, /joinGroup/)
assert.match(preload, /discover:snapshot/)
assert.match(preload, /group:join/)
assert.match(discoverIpc, /DISCOVER_IPC\.snapshot/)
assert.match(groupService, /joinDiscoverableGroup/)
assert.match(groupService, /listDiscoverableGroupsForAdvert/)

console.log('verify:discover: ok')
