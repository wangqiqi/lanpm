/**
 * 文档 ↔ 代码可机读一致性检查；§1 写入 archive/audit/docs-code/（见 DOCS_CODE_REPORT）
 * Run: npm run verify:docs-code
 * CI 门禁: npm run verify:docs-code -- --strict
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const strict = process.argv.includes('--strict')
const now = new Date().toISOString().slice(0, 10)

type Diff = {
  id: string
  severity: 'P0' | 'P1' | 'P2'
  source: string
  doc: string
  code: string
  fix: string
}

const diffs: Diff[] = []

function add(d: Omit<Diff, 'id'> & { id?: string }): void {
  diffs.push({ id: d.id ?? `DOC-AUTO-${String(diffs.length + 1).padStart(2, '0')}`, ...d })
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  version: string
  scripts: Record<string, string>
}
const version = pkg.version

function extractRcLabel(text: string): string | null {
  const m = text.match(/1\.0\.0-rc\.\d+/g)
  return m?.[m.length - 1] ?? null
}

// --- RC 版本号 ---
const readme = readFileSync(join(root, 'README.md'), 'utf8')
const readmeRc = extractRcLabel(readme)
if (readmeRc && readmeRc !== version) {
  add({
    severity: 'P1',
    source: 'README.md',
    doc: `声明 ${readmeRc}`,
    code: `package.json → ${version}`,
    fix: '将 README §当前状态 RC 号与 package.json 对齐'
  })
}

const prd = readFileSync(join(root, 'docs/01_产品需求文档.md'), 'utf8')
const prdRc = prd.match(/RC 实现现状（`(1\.0\.0-rc\.\d+)`）/)?.[1]
if (prdRc && prdRc !== version) {
  add({
    severity: 'P1',
    source: 'docs/01 §1.3.1',
    doc: `文首 RC 标签 ${prdRc}`,
    code: `package.json → ${version}`,
    fix: '更新 docs/01 §1.3.1 标题 RC 号'
  })
}

const tech = readFileSync(join(root, 'docs/02_技术实现建议.md'), 'utf8')
const techRc = tech.match(/RC 实现说明[^`]*`(1\.0\.0-rc\.\d+)`/)?.[1]
if (techRc && techRc !== version) {
  add({
    severity: 'P2',
    source: 'docs/02',
    doc: `RC 实现说明 ${techRc}`,
    code: `package.json → ${version}`,
    fix: '更新 docs/02 RC 实现说明处版本号'
  })
}

// --- docs/05 登记的 verify 脚本 ---
const doc05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
const docScripts = new Set<string>()
for (const m of doc05.matchAll(/`(verify:[a-z0-9-]+)`/g)) {
  docScripts.add(m[1]!)
}
const missingScripts: string[] = []
for (const name of docScripts) {
  if (!pkg.scripts[name]) missingScripts.push(name)
}
if (missingScripts.length > 0) {
  add({
    severity: 'P0',
    source: 'docs/05',
    doc: `引用的脚本: ${missingScripts.join(', ')}`,
    code: 'package.json scripts 中不存在',
    fix: '补 npm script 或从 docs/05 删除过时命令'
  })
}

// --- P0 子集（链接 / RC 依赖）已独立守卫 ---
const p0Note =
  '以下项由 `verify:p0` 子脚本覆盖（本报告不重复失败）：verify:docs-links、verify:rc-reality、verify:ipc-contract …'

// --- 布局（与 docs/04、verify:visual 交叉）---
const topBar = readFileSync(join(root, 'src/renderer/src/layout/TopBar.module.css'), 'utf8')
const bottomNav = readFileSync(join(root, 'src/renderer/src/layout/BottomNav.module.css'), 'utf8')
const mainLayout = readFileSync(join(root, 'src/renderer/src/layout/MainLayout.module.css'), 'utf8')
const doc04 = readFileSync(join(root, 'docs/04_交互与UI约定.md'), 'utf8')

if (doc04.includes('56px') && !/height:\s*56px/.test(topBar)) {
  add({
    severity: 'P1',
    source: 'docs/04 vs TopBar.module.css',
    doc: '顶栏 56px',
    code: 'CSS 未匹配 height: 56px',
    fix: '恢复 TopBar 高度或更新 docs/04'
  })
}
if (doc04.includes('64px') && !/height:\s*64px/.test(bottomNav)) {
  add({
    severity: 'P1',
    source: 'docs/04 vs BottomNav.module.css',
    doc: '底栏 64px',
    code: 'CSS 未匹配 height: 64px',
    fix: '恢复 BottomNav 高度或更新 docs/04'
  })
}
if (doc04.includes('16px') && !/\.main\s*\{[^}]*padding:\s*16px/s.test(mainLayout)) {
  add({
    severity: 'P1',
    source: 'docs/04 vs MainLayout.module.css',
    doc: '主区内边距 16px',
    code: '.main padding 非 16px',
    fix: '恢复 MainLayout 或更新 docs/04'
  })
}

// --- 报告 ---
const openCount = diffs.length
const section1 = `## 1. 自动化检测（${openCount === 0 ? '无差异 ✅' : `${openCount} 项待处理`}）

| ID | 严重 | 来源 | 文档 | 代码/实现 | 建议修复 |
|----|------|------|------|-----------|----------|
${diffs
  .map(
    (d) =>
      `| ${d.id} | ${d.severity} | ${d.source} | ${d.doc} | ${d.code} | ${d.fix} |`
  )
  .join('\n')}
${p0Note}
`

const DOCS_CODE_REPORT = join(
  root,
  'archive/audit/docs-code/20260529_170000_代码文档差异_rc37.md'
)
const outPath = DOCS_CODE_REPORT
let tail = '\n## 2. 待办\n\n见根目录 `todo.md`。\n'
if (existsSync(outPath)) {
  const raw = readFileSync(outPath, 'utf8')
  const idx = raw.indexOf('\n## 2.')
  if (idx >= 0) tail = raw.slice(idx)
}

const body = `# 代码与文档差异

> ${now} · \`${version}\` · \`npm run verify:docs-code\`

${section1}
${tail}
`

writeFileSync(outPath, body, 'utf8')

console.log(`verify:docs-code: wrote ${outPath} (${openCount} diff(s))`)
if (strict && openCount > 0) {
  assert.fail(`strict mode: ${openCount} doc/code mismatch(es) — see verify:docs-code report §1`)
}
console.log('verify:docs-code OK')
