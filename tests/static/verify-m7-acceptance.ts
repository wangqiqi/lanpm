/**
 * M7-01 docs/03 §16 自动化证据映射（静态存在性 + 关键模块）。
 * Run: npm run verify:m7-acceptance
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function mustExist(rel: string): void {
  const p = join(root, rel)
  assert.ok(existsSync(p), `missing: ${rel}`)
}

const checks: { section: string; path: string }[] = [
  { section: '16.1 首次配置', path: 'src/renderer/src/features/setup/SetupWizard.tsx' },
  { section: '16.2 主框架', path: 'src/renderer/src/layout/TopBar.tsx' },
  { section: '16.2 全局搜索', path: 'src/main/search/searchService.ts' },
  { section: '16.2 五视图', path: 'src/renderer/src/layout/BottomNav.tsx' },
  { section: '16.2 视觉组件', path: 'src/renderer/src/ui/ViewHeader.tsx' },
  { section: '16.3 聊天', path: 'src/renderer/src/features/chat/ChatView.tsx' },
  { section: '16.4 看板', path: 'src/renderer/src/features/board/BoardView.tsx' },
  { section: '16.5 任务树', path: 'src/renderer/src/features/tree/TaskTreeView.tsx' },
  { section: '16.6 甘特', path: 'src/renderer/src/features/gantt/GanttView.tsx' },
  { section: '16.7 文件', path: 'src/renderer/src/features/files/FilesView.tsx' },
  { section: '16.8 群组', path: 'src/main/group/groupService.ts' },
  { section: '16.9 驾驶舱', path: 'src/renderer/src/views/CockpitView.tsx' },
  { section: '16.10 网络', path: 'src/main/network/real/RealNetworkTransport.ts' },
  { section: '16.10 加密', path: 'src/main/crypto/envelopeCrypto.ts' }
]

for (const c of checks) {
  mustExist(c.path)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>
}
for (const script of ['verify:m0', 'verify:m2', 'verify:m3', 'verify:m4', 'verify:m5', 'verify:m6']) {
  assert.ok(pkg.scripts[script], `package.json missing ${script}`)
}

const tabRules = readFileSync(join(root, 'src/shared/navigation/tabRules.ts'), 'utf8')
assert.match(tabRules, /anonymous.*chat/s)

console.log(`verify-m7-acceptance: ok (${checks.length} modules)`)
