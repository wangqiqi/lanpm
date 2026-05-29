/**
 * 视觉一致性静态守卫（V-01~V-13 回归 + V-14a 自动化部分）。
 * Run: npm run verify:visual
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const renderer = join(root, 'src/renderer/src')

const REQUIRED_TOKENS = [
  '--lanpm-border',
  '--lanpm-bubble-bg',
  '--lanpm-code-bg',
  '--lanpm-accent-fill',
  '--lanpm-accent-fill-strong',
  '--lanpm-accent-ring'
] as const

const FORBIDDEN_PATTERNS = [
  /#1677ff/i,
  /rgba\(\s*22\s*,\s*119\s*,\s*255/gi,
  /features\/shell\//,
  /ViewPlaceholder/,
  /CockpitPlaceholder/
] as const

const UI_COMPONENTS = [
  'ui/ViewHeader.tsx',
  'ui/ViewToolbar.tsx',
  'ui/ViewState.tsx',
  'ui/cssVar.ts',
  'ui/regionInteract.module.css',
  'ui/RegionButton.tsx',
  'ui/RegionTabBar.tsx',
  'ui/ViewSegment.tsx'
] as const

const LAYOUT_SNIPPETS: { file: string; pattern: RegExp; label: string }[] = [
  { file: 'layout/TopBar.module.css', pattern: /height:\s*56px/, label: 'TopBar 56px' },
  { file: 'layout/BottomNav.module.css', pattern: /height:\s*64px/, label: 'BottomNav 64px' },
  {
    file: 'layout/MainLayout.module.css',
    pattern: /\.main\s*\{[^}]*padding:\s*16px/s,
    label: 'MainLayout padding 16px'
  },
  {
    file: 'views/CockpitView.module.css',
    pattern: /max-width:\s*1100px/,
    label: 'CockpitView must not use max-width narrow column',
    invert: true
  }
] as { file: string; pattern: RegExp; label: string; invert?: boolean }[]

function walkCssFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules') continue
      walkCssFiles(p, out)
    } else if (name.endsWith('.module.css') || name === 'global.module.css') {
      out.push(p)
    }
  }
  return out
}

function mustNotExist(rel: string): void {
  assert.ok(!existsSync(join(root, rel)), `legacy path should be removed: ${rel}`)
}

// --- tokens in global ---
const globalCss = readFileSync(join(renderer, 'styles/global.module.css'), 'utf8')
for (const theme of ["html[data-theme='light']", "html[data-theme='dark']"]) {
  const block = globalCss.includes(theme)
  assert.ok(block, `global.module.css missing ${theme}`)
}
for (const token of REQUIRED_TOKENS) {
  assert.ok(globalCss.includes(token), `global.module.css missing ${token} in both themes`)
  const lightIdx = globalCss.indexOf("html[data-theme='light']")
  const darkIdx = globalCss.indexOf("html[data-theme='dark']")
  const lightBlock = globalCss.slice(lightIdx, darkIdx)
  const darkBlock = globalCss.slice(darkIdx)
  assert.ok(lightBlock.includes(token), `light theme missing ${token}`)
  assert.ok(darkBlock.includes(token), `dark theme missing ${token}`)
}

// --- UI components ---
for (const rel of UI_COMPONENTS) {
  assert.ok(existsSync(join(renderer, rel)), `missing ${rel}`)
}

// --- views use ViewHeader ---
for (const rel of ['views/GroupView.tsx', 'views/CockpitView.tsx']) {
  const src = readFileSync(join(renderer, rel), 'utf8')
  assert.match(src, /ViewHeader/, `${rel} should use ViewHeader`)
}

// --- legacy removed ---
mustNotExist('src/renderer/src/features/shell/MainLayout.tsx')
mustNotExist('src/renderer/src/features/views/ViewPlaceholder.tsx')

// --- layout sizes ---
for (const { file, pattern, label, invert } of LAYOUT_SNIPPETS) {
  const content = readFileSync(join(renderer, file), 'utf8')
  if (invert) {
    assert.ok(!pattern.test(content), label)
  } else {
    assert.match(content, pattern, label)
  }
}

// --- forbidden colors / dead refs in renderer ---
const cssFiles = walkCssFiles(renderer)
let scanned = 0
for (const file of cssFiles) {
  const rel = file.slice(renderer.length + 1)
  const content = readFileSync(file, 'utf8')
  scanned++
  for (const pat of FORBIDDEN_PATTERNS.slice(0, 2)) {
    const m = content.match(pat)
    assert.ok(!m, `${rel}: forbidden color pattern ${pat} → ${m?.[0] ?? ''}`)
  }
}

const tsxFiles: string[] = []
function walkTsx(dir: string): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walkTsx(p)
    else if (name.endsWith('.tsx') || name.endsWith('.ts')) tsxFiles.push(p)
  }
}
walkTsx(renderer)
for (const file of tsxFiles) {
  const rel = file.slice(renderer.length + 1)
  const content = readFileSync(file, 'utf8')
  for (const pat of FORBIDDEN_PATTERNS.slice(2)) {
    assert.ok(!pat.test(content), `${rel}: forbidden reference ${pat}`)
  }
}

// --- feature views use shared state ---
for (const rel of [
  'features/board/BoardView.tsx',
  'features/tree/TaskTreeView.tsx',
  'features/gantt/GanttView.tsx',
  'features/files/FilesView.tsx'
]) {
  const src = readFileSync(join(renderer, rel), 'utf8')
  assert.match(src, /ViewToolbar/, `${rel} should use ViewToolbar`)
  assert.match(src, /ViewLoadingCenter|ViewEmptyHint/, `${rel} should use ViewState helpers`)
}

assert.ok(
  readFileSync(join(renderer, 'features/gantt/GanttView.tsx'), 'utf8').includes('readCssVar'),
  'GanttView should read accent fill for todayColor'
)

const bottomNavCss = readFileSync(join(renderer, 'layout/BottomNav.module.css'), 'utf8')
assert.match(
  bottomNavCss,
  /composes:\s*region.*regionInteract/,
  'BottomNav should compose regionInteract'
)

for (const [rel, token] of [
  ['features/files/FilesView.tsx', 'ViewSegment'],
  ['features/gantt/GanttView.tsx', 'ViewSegment'],
  ['features/chat/DmSessionBar.tsx', 'RegionTabBar'],
  ['layout/TopBar.tsx', 'RegionButton']
] as const) {
  const src = readFileSync(join(renderer, rel), 'utf8')
  assert.match(src, new RegExp(token), `${rel} should use ${token}`)
}

console.log(
  'verify:visual OK',
  `(${REQUIRED_TOKENS.length} tokens, ${UI_COMPONENTS.length} ui modules, ${scanned} css files)`
)
