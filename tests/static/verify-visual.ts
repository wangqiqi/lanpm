/**
 * 视觉一致性静态守卫（V-01~V-13 回归 + V-14a 自动化部分）。
 * Run: npm run verify:visual
 */
import {
  LANPM_ACCENT,
  LANPM_ACCENT_RING_RGBA,
  LANPM_RADIUS_PX,
  LANPM_TASK_FAMILY
} from '../../src/shared/design/lanpmDesignTokens.ts'
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
  '--lanpm-selected-bg',
  '--lanpm-surface-elevated',
  '--lanpm-shadow-md',
  '--lanpm-shadow-island',
  '--lanpm-radius-md',
  '--lanpm-radius-xl',
  '--lanpm-success',
  '--lanpm-warning',
  '--lanpm-danger',
  '--lanpm-on-accent'
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

/** 业务 module.css 禁止散落硬编码色（令牌定义仅在 global.module.css） */
const FORBIDDEN_MODULE_HEX = [
  /#007a3d/i,
  /#0071e3/i,
  /#e5e5ea/i,
  /#38383a/i,
  /#ff0000\b/i,
  /#248a3d/i,
  /#8f6b00/i
] as const

const FORBIDDEN_PHANTOM_TOKENS = [
  '--lanpm-border-subtle',
  '--lanpm-surface-secondary',
  '--lanpm-text-primary'
] as const

const HEX_FALLBACK_IN_VAR = /var\(--lanpm-[^,)]+,\s*#[0-9a-fA-F]{3,8}/gi

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
  {
    file: 'layout/TopBar.module.css',
    pattern: /\.barDivider\s*\{[^}]*height:\s*20px/s,
    label: 'TopBar divider 20px centered'
  },
  {
    file: 'ui/RegionButton.module.css',
    pattern: /\.icon\s*\{[^}]*height:\s*32px/s,
    label: 'RegionButton icon 32px'
  },
  {
    file: 'ui/RegionButton.module.css',
    pattern: /\.text\s*\{[^}]*height:\s*32px/s,
    label: 'RegionButton text 32px'
  },
  {
    file: 'ui/RegionButton.module.css',
    pattern: /\.user\s*\{[^}]*height:\s*32px/s,
    label: 'RegionButton user 32px'
  },
  {
    file: 'layout/GlobalSearch.module.css',
    pattern: /\.input\s*\{[^}]*height:\s*32px/s,
    label: 'GlobalSearch input 32px'
  },
  {
    file: 'layout/BottomNav.module.css',
    pattern: /min-height:\s*49px/,
    label: 'BottomNav iOS tab bar min-height 49px'
  },
  {
    file: 'layout/MainLayout.module.css',
    pattern: /\.main\s*\{[^}]*padding:\s*var\(--lanpm-canvas-inset\)/s,
    label: 'MainLayout padding canvas-inset'
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

// --- design token SSOT (global.module.css ↔ lanpmDesignTokens ↔ ThemeProvider) ---
const lightAccent = themeTokenValue(lightBlock, '--lanpm-accent')
const darkAccent = themeTokenValue(darkBlock, '--lanpm-accent')
assert.equal(lightAccent, LANPM_ACCENT.light, 'global light --lanpm-accent must match SSOT')
assert.equal(darkAccent, LANPM_ACCENT.dark, 'global dark --lanpm-accent must match SSOT')
assert.equal(
  themeTokenValue(lightBlock, '--lanpm-accent-hover'),
  LANPM_ACCENT.lightHover,
  'global light --lanpm-accent-hover must match SSOT'
)
assert.equal(
  themeTokenValue(darkBlock, '--lanpm-accent-hover'),
  LANPM_ACCENT.darkHover,
  'global dark --lanpm-accent-hover must match SSOT'
)
assert.equal(
  themeTokenValue(lightBlock, '--lanpm-accent-ring'),
  LANPM_ACCENT_RING_RGBA.light,
  'global light --lanpm-accent-ring must match SSOT'
)
assert.equal(
  themeTokenValue(darkBlock, '--lanpm-accent-ring'),
  LANPM_ACCENT_RING_RGBA.dark,
  'global dark --lanpm-accent-ring must match SSOT'
)
for (const [key, px] of [
  ['sm', LANPM_RADIUS_PX.sm],
  ['md', LANPM_RADIUS_PX.md],
  ['lg', LANPM_RADIUS_PX.lg],
  ['xl', LANPM_RADIUS_PX.xl]
] as const) {
  const lightRadius = themeTokenValue(lightBlock, `--lanpm-radius-${key}`)
  const darkRadius = themeTokenValue(darkBlock, `--lanpm-radius-${key}`)
  assert.equal(lightRadius, `${px}px`, `light --lanpm-radius-${key} must be ${px}px`)
  assert.equal(darkRadius, `${px}px`, `dark --lanpm-radius-${key} must be ${px}px`)
}

const themeProviderSrc = readFileSync(join(renderer, 'app/ThemeProvider.tsx'), 'utf8')
assert.match(themeProviderSrc, /lanpmDesignTokens/, 'ThemeProvider must import lanpmDesignTokens SSOT')
assert.ok(!themeProviderSrc.includes('#0071e3'), 'ThemeProvider must not use legacy #0071e3 accent')

const htmlRootEnd = globalCss.indexOf("html[data-theme='light']")
const htmlRootBlock = globalCss.slice(0, htmlRootEnd)
for (let i = 0; i < LANPM_TASK_FAMILY.length; i++) {
  const token = `--lanpm-task-family-${i}`
  const val = themeTokenValue(htmlRootBlock, token)
  assert.equal(val, LANPM_TASK_FAMILY[i], `${token} must match lanpmDesignTokens LANPM_TASK_FAMILY[${i}]`)
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

const cockpitSrc = readFileSync(join(renderer, 'views/CockpitView.tsx'), 'utf8')
assert.match(cockpitSrc, /kpiGrid/, 'CockpitView should use custom KPI grid')
const kpiIdx = cockpitSrc.indexOf('kpiGrid')
const reportIdx = cockpitSrc.indexOf('cockpit.reportOutput')
assert.ok(
  kpiIdx >= 0 && reportIdx >= 0 && kpiIdx < reportIdx,
  'CockpitView KPI grid must appear before report panel (CK-402)'
)
assert.match(
  cockpitSrc,
  /reportExpanded,\s*setReportExpanded\]\s*=\s*useState\(false\)/,
  'Cockpit report must default collapsed (CK-402)'
)
assert.ok(
  !/\b(Card|Statistic|Row|Col|Tag)\b/.test(cockpitSrc),
  'CockpitView must not use Ant Card/Statistic/Row/Col/Tag'
)
const cockpitCss = readFileSync(join(renderer, 'views/CockpitView.module.css'), 'utf8')
assert.match(cockpitCss, /\.panel\b/, 'CockpitView must use island panel styles')
assert.match(cockpitCss, /\.kpiValue\b/, 'CockpitView KPI must use custom typography')
assert.match(
  cockpitCss,
  /\.reportPreExpanded\s*\{[^}]*max-height:\s*min\(40dvh,\s*28rem\)/s,
  'Cockpit report expanded height must stay bounded (CK-402)'
)
assert.match(
  cockpitSrc,
  /executiveSummary/,
  'CockpitView must render executive summary (CK-403)'
)
assert.match(
  cockpitSrc,
  /attentionTasks/,
  'CockpitView must render attention task list (CK-404)'
)
assert.match(cockpitCss, /\.attentionTaskList\b/, 'Cockpit attention task list (CK-404)')
assert.match(cockpitCss, /\.execSummary\b/, 'Cockpit executive summary strip (CK-403)')
assert.match(cockpitCss, /\.reportTeaser\b/, 'Cockpit collapsed report teaser (CK-402)')
assert.ok(
  !/\.root\s*\{[^}]*height:\s*100%/.test(cockpitCss),
  'CockpitView root must not lock height:100% (CK-401 scroll contract)'
)
assert.match(
  cockpitCss,
  /\.root\s*\{[^}]*overflow-y:\s*auto/s,
  'CockpitView root must be the single vertical scroll container (CK-401)'
)

const mainLayoutCss = readFileSync(join(renderer, 'layout/MainLayout.module.css'), 'utf8')
assert.match(mainLayoutCss, /\.mainCockpit\b/, 'MainLayout must define mainCockpit (CK-401)')
assert.match(
  mainLayoutCss,
  /\.mainCockpit\s*\{[^}]*overflow:\s*hidden/s,
  'mainCockpit must not scroll (CK-401)'
)
const mainLayoutSrc = readFileSync(join(renderer, 'layout/MainLayout.tsx'), 'utf8')
assert.match(mainLayoutSrc, /mainCockpit/, 'MainLayout must apply mainCockpit on cockpit route (CK-401)')

const chatCss = readFileSync(join(renderer, 'features/chat/chat.module.css'), 'utf8')
const chatSrc = readFileSync(join(renderer, 'features/chat/ChatView.tsx'), 'utf8')
assert.match(chatCss, /\.bubbleOwn[\s\S]*--lanpm-selected-bg/, 'bubbleOwn must use selected-bg fill (VP-404)')
assert.match(chatCss, /\.composerIsland/, 'chat.module.css must define composerIsland (VP-404)')
assert.match(chatSrc, /composerIsland/, 'ChatView must wrap composer in island bar (VP-404)')
assert.ok(
  !/\.mentionOwn\s*\{[^}]*--lanpm-on-accent/.test(chatCss),
  'mentionOwn must not use on-accent on solid fill (VP-404)'
)
assert.ok(
  !/\.taskRefOwn\s*\{[^}]*--lanpm-on-accent/.test(chatCss),
  'taskRefOwn must not use on-accent on solid fill (VP-404)'
)
assert.ok(
  !/\.bubbleOwn\s*\{[^}]*background:\s*var\(--lanpm-accent\)/.test(chatCss),
  'bubbleOwn must not use solid accent background (VP-404)'
)

const topBarCss = readFileSync(join(renderer, 'layout/TopBar.module.css'), 'utf8')
const topBarSrc = readFileSync(join(renderer, 'layout/TopBar.tsx'), 'utf8')
assert.match(
  topBarCss,
  /@media\s*\(max-width:\s*1100px\)[\s\S]*\.barWideActions\s*\{[^}]*display:\s*flex/,
  'barWideActions must stay visible at ≤1100px (VP-405)'
)
assert.ok(
  !/key:\s*'discover'/.test(topBarSrc),
  'TopBar must not nest discover in overflow menu (VP-405)'
)

const calendarCss = readFileSync(join(renderer, 'features/calendar/calendar.module.css'), 'utf8')
assert.match(calendarCss, /--lanpm-shadow-island/, 'calendar host uses island shadow (VP-406)')
assert.ok(
  !/\.light\b|\.dark\b/.test(calendarCss),
  'calendar FC theme should scope under .calendarHost not .light/.dark (VP-406)'
)
const fcVarLines = calendarCss.match(/--fc-[a-z0-9-]+:\s*[^;]+;/g) ?? []
assert.ok(fcVarLines.length >= 16, `calendar should define FC CSS variables (VP-406), got ${fcVarLines.length}`)
for (const line of fcVarLines) {
  if (/transparent/.test(line) || /--fc-[a-z0-9-]+:\s*[\d.]+;/.test(line)) continue
  assert.match(
    line,
    /var\(--lanpm-/,
    `calendar FC variable must reference --lanpm-* token: ${line.trim()}`
  )
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

const definedLanpmTokens = new Set(
  [...globalCss.matchAll(/(--lanpm-[a-z0-9-]+):/g)].map((m) => m[1])
)
const usedLanpmTokens = new Set<string>()
for (const file of cssFiles) {
  const content = readFileSync(file, 'utf8')
  for (const m of content.matchAll(/(--lanpm-[a-z0-9-]+):/g)) {
    definedLanpmTokens.add(m[1])
  }
  for (const m of content.matchAll(/var\((--lanpm-[a-z0-9-]+)\)/g)) {
    usedLanpmTokens.add(m[1])
  }
}
const undefinedTokens = [...usedLanpmTokens].filter((t) => !definedLanpmTokens.has(t)).sort()
assert.equal(
  undefinedTokens.length,
  0,
  `CSS references undefined --lanpm-* tokens: ${undefinedTokens.join(', ')}`
)

let scanned = 0
for (const file of cssFiles) {
  const rel = file.slice(renderer.length + 1)
  const content = readFileSync(file, 'utf8')
  scanned++
  const isGlobal = rel === 'styles/global.module.css'
  for (const pat of FORBIDDEN_PATTERNS.slice(0, 6)) {
    const m = content.match(pat)
    assert.ok(!m, `${rel}: forbidden color pattern ${pat} → ${m?.[0] ?? ''}`)
  }
  const badFallback = content.match(BAD_TOKEN_FALLBACK)
  assert.ok(!badFallback, `${rel}: use --lanpm-* without rgba(0,0,0,*) fallback`)
  if (!isGlobal) {
    for (const pat of FORBIDDEN_MODULE_HEX) {
      const m = content.match(pat)
      assert.ok(!m, `${rel}: legacy hardcoded hex ${pat} → use semantic --lanpm-* tokens`)
    }
    for (const phantom of FORBIDDEN_PHANTOM_TOKENS) {
      assert.ok(!content.includes(phantom), `${rel}: unknown token ${phantom}`)
    }
    const hexVarFallback = content.match(HEX_FALLBACK_IN_VAR)
    assert.ok(
      !hexVarFallback,
      `${rel}: do not use var(--lanpm-*, #hex) fallbacks → ${hexVarFallback?.[0] ?? ''}`
    )
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
assert.match(boardCss, /priorityHigh[\s\S]*--lanpm-danger/, 'priorityHigh must use --lanpm-danger (V-14b-SEM)')
assert.match(boardCss, /priorityMedium[\s\S]*--lanpm-warning/, 'priorityMedium must use --lanpm-warning')
assert.match(boardCss, /priorityLow[\s\S]*--lanpm-text-secondary/, 'priorityLow must use secondary text token')

const crashCss = readFileSync(join(renderer, 'app/crash.module.css'), 'utf8')
assert.match(crashCss, /var\(--lanpm-bg\)/, 'crash page must use theme tokens')
assert.match(crashCss, /var\(--lanpm-accent\)/, 'crash reload button must use accent token')

const VIS07B_CSS = [
  'features/board/board.module.css',
  'features/gantt/gantt.module.css',
  'features/chat/chat.module.css',
  'features/tree/tree.module.css',
  'features/files/files.module.css'
] as const
for (const rel of VIS07B_CSS) {
  const css = readFileSync(join(renderer, rel), 'utf8')
  const pxFonts = css.match(/font-size:\s*\d+px/g)
  assert.ok(!pxFonts?.length, `${rel} must use --lanpm-font-* not ${pxFonts?.join(', ')} (VIS-07b)`)
}

for (const rel of ['app/AppRouter.tsx', 'views/GroupView.tsx'] as const) {
  const src = readFileSync(join(renderer, rel), 'utf8')
  assert.ok(!/\blazy\s*\(/.test(src), `${rel} must not use React.lazy (Rolldown CJS chunk cycle)`)
}

const bottomNavCss = readFileSync(join(renderer, 'layout/BottomNav.module.css'), 'utf8')
assert.ok(
  !/composes:\s*region.*regionInteract/.test(bottomNavCss),
  'BottomNav uses dedicated iOS tab styles (not regionInteract composes)'
)
assert.match(bottomNavCss, /var\(--lanpm-font-tab\)/, 'BottomNav tab label should use --lanpm-font-tab')
assert.ok(
  !/tabIconHoverBounce|tabIconPop/.test(bottomNavCss),
  'BottomNav must not use bounce keyframes (VP-407)'
)
assert.match(
  bottomNavCss,
  /transform var\(--lanpm-motion-fast\)/,
  'BottomNav icon motion uses fast token (VP-407)'
)

const viewStateCss = readFileSync(join(renderer, 'ui/ViewState.module.css'), 'utf8')
assert.match(viewStateCss, /\.iconRing/, 'ViewState empty/loading icon ring (VP-407)')

const regionTabBarCss = readFileSync(join(renderer, 'ui/RegionTabBar.module.css'), 'utf8')
assert.ok(
  !/composes:\s*region.*regionInteract/.test(regionTabBarCss),
  'RegionTabBar uses dedicated tab styles (not regionInteract composes)'
)
assert.match(
  regionTabBarCss,
  /var\(--lanpm-separator\)/,
  'RegionTabBar should use hairline --lanpm-separator'
)

const regionCss = readFileSync(join(renderer, 'ui/regionInteract.module.css'), 'utf8')
assert.match(regionCss, /--lanpm-hover-bg/, 'regionInteract hover must use --lanpm-hover-bg (V-14b-HOV static)')
assert.match(regionCss, /--lanpm-accent-fill/, 'regionInteract selected must use accent fill tokens')

const viewSegmentCss = readFileSync(join(renderer, 'ui/ViewSegment.module.css'), 'utf8')
assert.match(
  viewSegmentCss,
  /var\(--lanpm-segment-shadow\)/,
  'ViewSegment selected segment uses --lanpm-segment-shadow'
)

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
  ['features/chat/DmSessionBar.tsx', 'dmSessionItem'],
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
