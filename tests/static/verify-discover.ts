/**
 * 顶栏「发现」：DiscoverModal + discover:snapshot + group:join + pairing UI。
 * Run: npm run verify:discover
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const topbar = readFileSync(join(root, 'src/renderer/src/layout/TopBar.tsx'), 'utf8')
const modal = readFileSync(join(root, 'src/renderer/src/features/discover/DiscoverModal.tsx'), 'utf8')
const pairingPanel = readFileSync(
  join(root, 'src/renderer/src/features/discover/DiscoverPairingPanel.tsx'),
  'utf8'
)
const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
const discoverIpc = readFileSync(join(root, 'src/main/ipc/discover.ts'), 'utf8')
const groupIpc = readFileSync(join(root, 'src/main/ipc/group.ts'), 'utf8')
const pairingIpc = readFileSync(join(root, 'src/main/ipc/pairing.ts'), 'utf8')

assert.match(topbar, /DiscoverModal/)
assert.match(topbar, /topbar\.discover/)
assert.match(modal, /discover\.snapshot/)
assert.match(modal, /DiscoverPairingPanel/)
assert.match(modal, /findGroupsByCode/)
assert.match(modal, /requestJoinNamed/)
assert.match(modal, /tabGroups/)
assert.match(pairingPanel, /pairing\.start/)
assert.match(pairingPanel, /pairing\.join/)
assert.match(pairingPanel, /crossSubnet/)
assert.match(pairingPanel, /localIpTail/)
assert.match(preload, /discover:snapshot/)
assert.match(preload, /group:join/)
assert.match(preload, /pairing:start/)
assert.match(preload, /pairing:join/)
assert.match(discoverIpc, /DISCOVER_IPC\.snapshot/)
assert.match(groupIpc, /requestJoinDiscoverableGroup/)
assert.match(pairingIpc, /startPairingSession/)

console.log('verify:discover: ok')
