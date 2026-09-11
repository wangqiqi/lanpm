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
const homeRedirect = readFileSync(join(root, 'src/renderer/src/routes/HomeRedirect.tsx'), 'utf8')
const uiStore = readFileSync(join(root, 'src/renderer/src/stores/uiStore.ts'), 'utf8')
const setupWizard = readFileSync(join(root, 'src/renderer/src/features/setup/SetupWizard.tsx'), 'utf8')
const coachmark = readFileSync(
  join(root, 'src/renderer/src/features/discover/DiscoverCoachmark.tsx'),
  'utf8'
)
const pairingClipboard = readFileSync(
  join(root, 'src/shared/discover/pairingShareClipboard.ts'),
  'utf8'
)
const cockpit = readFileSync(join(root, 'src/renderer/src/views/CockpitView.tsx'), 'utf8')
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
assert.match(pairingPanel, /pairingRouteHint/)
assert.match(pairingPanel, /exportPeerFileDialog/)
assert.match(pairingPanel, /NetworkHelpModal/)
assert.match(pairingPanel, /data-testid="discover-net-help-link"/)
assert.match(pairingPanel, /data-testid="discover-share-pairing"/)
assert.match(pairingPanel, /data-testid="discover-pairing-role"/)
assert.match(pairingPanel, /data-testid="discover-codes-explainer"/)
assert.match(pairingPanel, /data-testid="discover-pairing-share-meta"/)
assert.match(pairingPanel, /data-testid="discover-pairing-unicast-host"/)
assert.match(pairingPanel, /data-testid="discover-pairing-connect"/)
assert.match(modal, /importPeerFileDialog/)
assert.match(modal, /pickSingleJoinableGroup/)
assert.match(modal, /data-testid="discover-connect-peer-cta"/)
assert.match(homeRedirect, /requestDiscoverOpen/)
assert.match(pairingPanel, /formatPairingShareClipboard/)
assert.match(pairingPanel, /data-testid="discover-copy-pairing-info"/)
assert.match(uiStore, /discoverOpenPending/)
assert.match(uiStore, /discoverCoachmarkPending/)
assert.match(uiStore, /requestDiscoverCoachmark/)
assert.match(setupWizard, /requestDiscoverCoachmark/)
assert.match(setupWizard, /networkSkipped/)
assert.match(topbar, /DiscoverCoachmark/)
assert.match(topbar, /isDiscoverCoachmarkSeen/)
assert.match(coachmark, /data-testid="discover-coachmark-tour"/)
assert.match(pairingClipboard, /formatPairingShareClipboard/)
assert.match(cockpit, /cockpit-join-with-code/)
assert.match(cockpit, /requestDiscoverOpen/)
assert.match(topbar, /data-testid="topbar-discover"/)
// TASK-8404: 顶栏网络下拉仅刷新/重连；手动节点经发现内 CTA → ManualPeerModal
const netDropdownBlock = topbar.slice(
  topbar.indexOf("key: 'refresh'"),
  topbar.indexOf('<ManualPeerModal')
)
assert.doesNotMatch(netDropdownBlock, /addManualPeer|manualPeerTitle|setManualPeerOpen/)
assert.match(modal, /tryAutoJoinAfterSnapshot/)
assert.match(modal, /handlePairingJoined/)
assert.match(modal, /join_pending/)
// TASK-8402: 零群首屏 → 驾驶舱 + 自动打开发现
assert.match(homeRedirect, /groups\.length === 0/)
assert.match(homeRedirect, /cockpitPath\(\)/)

// TASK-8501: 跨网段 host/尾段同层；子网扫描在 Collapse 内
const crossSubnetUi = pairingPanel.slice(
  pairingPanel.indexOf('{crossSubnet ?'),
  pairingPanel.indexOf(') : null}', pairingPanel.indexOf('{crossSubnet ?'))
)
assert.match(crossSubnetUi, /data-testid="discover-pairing-unicast-host"/)
assert.match(crossSubnetUi, /<Collapse/)
const beforeCollapse = crossSubnetUi.split('<Collapse')[0]!
assert.match(beforeCollapse, /discover-pairing-unicast-host/)

// TASK-8502: 分享态复制配对信息（E2E 见 discover.spec.ts）
assert.match(pairingPanel, /handleCopyPairingInfo/)

// TASK-8503: idle 无导入/导出；配对文件在 DiscoverModal 高级区
const idleUi = pairingPanel.slice(
  pairingPanel.indexOf("  if (mode === 'idle') {\n    return"),
  pairingPanel.indexOf("  if (mode === 'share'")
)
assert.doesNotMatch(idleUi, /importPeerFile|exportPeerFile/)
assert.match(modal, /data-testid="discover-import-peer-file"/)
assert.match(modal, /data-testid="discover-export-peer-file"/)

// TASK-8504: 查找聚焦 + 粘贴 6 位自动 runFind
assert.match(pairingPanel, /handleCodePaste/)
assert.match(pairingPanel, /code\.length !== 6/)
assert.match(pairingPanel, /void runFind\(code\)/)
assert.match(pairingPanel, /codeInputRef\.current\?\.focus/)

// TASK-8505: Setup 跳过网络 → Coachmark（零群路径见 TopBar effect）
assert.match(setupWizard, /if \(networkSkipped\)/)

assert.match(preload, /discover:snapshot/)
assert.match(preload, /group:join/)
assert.match(preload, /pairing:start/)
assert.match(preload, /pairing:join/)
assert.match(preload, /pairing:exportPeerFileDialog/)
assert.match(preload, /pairing:importPeerFileDialog/)
assert.match(discoverIpc, /DISCOVER_IPC\.snapshot/)
assert.match(groupIpc, /requestJoinDiscoverableGroup/)
assert.match(pairingIpc, /startPairingSession/)
assert.match(pairingIpc, /importPeerFile/)

const docs05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
assert.match(docs05, /verify:dual-machine-playbook/, 'docs/05 links dual-machine playbook guard')
assert.match(docs05, /discover-connect-peer-cta|无法发现/, 'docs/05 §6 manual peer via discover')

console.log('verify:discover: ok')
