/**
 * 视觉一致性静态守卫（V-01~V-13 回归 + V-14a 自动化部分）。
 * Run: npm run verify:visual
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const renderer = join(root, 'src/renderer/src')

const REQUIRED_TOKENS = [
  '--lanpm-border',
  '--lanpm-bubble-bg',
  '--lanpm-code-bg',
  '--lanpm-accent-fill',
  '--lanpm-accent-fill-strong',
  '--lanpm-accent-ring',
  '--lanpm-success',
  '--lanpm-warning',
  '--lanpm-danger',
  '--lanpm-on-accent',
  '--lanpm-shadow-md'
] as const

const REQUIRED_FONT_TOKENS = [
  '--lanpm-font-caption',
  '--lanpm-font-body',
  '--lanpm-font-title',
  '--lanpm-font-display',
  '--lanpm-line-body'
] as const

const FORBIDDEN_PATTERNS = [
  /#1677ff/i,
  /rgba\(\s*22\s*,\s*119\s*,\s*255/gi,
  /#52c41a/i,
  /#ff4d4f/i,
  /#faad14/i,
  /#cf1322/i,
  /features\/shell\//,
  /ViewPlaceholder/,
  /CockpitPlaceholder/
] as const

const BAD_TOKEN_FALLBACK = /var\(--lanpm-[^,)]+,\s*rgba\(\s*0\s*,\s*0\s*,\s*0/gi

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
for (const token of REQUIRED_FONT_TOKENS) {
  assert.ok(globalCss.includes(token), `global.module.css missing font token ${token}`)
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

function themeTokenValue(block: string, token: string): string | null {
  const re = new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*([^;]+);`)
  const m = block.match(re)
  return m?.[1]?.trim() ?? null
}

const lightIdx = globalCss.indexOf("html[data-theme='light']")
const darkIdx = globalCss.indexOf("html[data-theme='dark']")
const lightBlock = globalCss.slice(lightIdx, darkIdx)
const darkBlock = globalCss.slice(darkIdx)
for (const token of ['--lanpm-bg', '--lanpm-text', '--lanpm-bubble-bg'] as const) {
  const lightVal = themeTokenValue(lightBlock, token)
  const darkVal = themeTokenValue(darkBlock, token)
  assert.ok(lightVal && darkVal, `${token} must be defined in both themes`)
  assert.notEqual(lightVal, darkVal, `${token} light/dark must differ (AUTO-17)`)
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
  for (const pat of FORBIDDEN_PATTERNS.slice(0, 6)) {
    const m = content.match(pat)
    assert.ok(!m, `${rel}: forbidden color pattern ${pat} → ${m?.[0] ?? ''}`)
  }
  const badFallback = content.match(BAD_TOKEN_FALLBACK)
  assert.ok(!badFallback, `${rel}: use --lanpm-* without rgba(0,0,0,*) fallback`)
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
  for (const pat of FORBIDDEN_PATTERNS.slice(6)) {
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

const ganttViewSrc = readFileSync(join(renderer, 'features/gantt/GanttView.tsx'), 'utf8')
assert.ok(ganttViewSrc.includes('readCssVar'), 'GanttView should read accent fill for todayColor')
assert.match(
  ganttViewSrc,
  /barBackgroundColor=\{ganttBarColors\.barBackgroundColor\}/,
  'GanttView should pass bar colors from design tokens (VIS-FIX-04)'
)

const ganttCss = readFileSync(join(renderer, 'features/gantt/gantt.module.css'), 'utf8')
assert.match(
  ganttCss,
  /\.calendar\s*>\s*rect/,
  'gantt.module.css should target .calendar > rect (VIS-FIX-01)'
)

const boardCss = readFileSync(join(renderer, 'features/board/board.module.css'), 'utf8')
assert.match(boardCss, /\.priorityHigh/, 'board.module.css should define priorityHigh (VIS-FIX-03)')

const bottomNavCss = readFileSync(join(renderer, 'layout/BottomNav.module.css'), 'utf8')
assert.match(
  bottomNavCss,
  /composes:\s*region.*regionInteract/,
  'BottomNav should compose regionInteract'
)
assert.match(bottomNavCss, /var\(--lanpm-font-caption\)/, 'BottomNav tab label should use font caption token')

const regionCss = readFileSync(join(renderer, 'ui/regionInteract.module.css'), 'utf8')
assert.match(regionCss, /--lanpm-hover-bg/, 'regionInteract hover must use --lanpm-hover-bg (V-14b-HOV static)')
assert.match(regionCss, /--lanpm-accent-fill/, 'regionInteract selected must use accent fill tokens')

const sharedUiFontToken = /var\(--lanpm-font-(caption|body|title|display)\)/
for (const rel of [
  'ui/ViewToolbar.module.css',
  'ui/ViewState.module.css',
  'ui/ViewSegment.module.css',
  'ui/RegionButton.module.css'
] as const) {
  const css = readFileSync(join(renderer, rel), 'utf8')
  assert.ok(sharedUiFontToken.test(css), `${rel} should use --lanpm-font-* tokens (VIS-07)`)
}

for (const [rel, token] of [
  ['features/files/FilesView.tsx', 'ViewSegment'],
  ['features/gantt/GanttView.tsx', 'ViewSegment'],
  ['features/chat/DmSessionBar.tsx', 'RegionTabBar'],
  ['layout/TopBar.tsx', 'RegionButton']
] as const) {
  const src = readFileSync(join(renderer, rel), 'utf8')
  assert.match(src, new RegExp(token), `${rel} should use ${token}`)
}

const TOKEN_PATTERN = /var\(--lanpm|readCssVar|cssVar\(/

const SEVEN_PAGE_VIEWS: { tsx: string; css?: string; label: string }[] = [
  { tsx: 'features/chat/ChatView.tsx', css: 'features/chat/chat.module.css', label: 'Chat' },
  { tsx: 'features/board/BoardView.tsx', css: 'features/board/board.module.css', label: 'Board' },
  { tsx: 'features/tree/TaskTreeView.tsx', css: 'features/tree/tree.module.css', label: 'Tree' },
  { tsx: 'features/gantt/GanttView.tsx', css: 'features/gantt/gantt.module.css', label: 'Gantt' },
  { tsx: 'features/files/FilesView.tsx', css: 'features/files/files.module.css', label: 'Files' },
  { tsx: 'views/CockpitView.tsx', css: 'views/CockpitView.module.css', label: 'Cockpit' },
  { tsx: 'features/setup/SetupWizard.tsx', css: 'features/setup/SetupWizard.module.css', label: 'Setup' }
]

for (const { tsx, css, label } of SEVEN_PAGE_VIEWS) {
  const tsxSrc = readFileSync(join(renderer, tsx), 'utf8')
  const cssPath = css ? join(renderer, css) : null
  const cssSrc = cssPath && existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : ''
  assert.ok(
    TOKEN_PATTERN.test(tsxSrc) || TOKEN_PATTERN.test(cssSrc),
    `${label} view (${tsx}) must use LanPM design tokens`
  )
}

console.log(
  'verify:visual OK',
  `(${REQUIRED_TOKENS.length}+${REQUIRED_FONT_TOKENS.length} tokens, ${UI_COMPONENTS.length} ui modules, ${SEVEN_PAGE_VIEWS.length} page views, ${scanned} css files)`
)
