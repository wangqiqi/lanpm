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
  '--lanpm-border-subtle',
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

/** 业务 module.css 禁止散落硬编码色（令牌定义仅在 global.css） */
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
  '--lanpm-surface-secondary',
  '--lanpm-text-primary'
] as const

const HEX_FALLBACK_IN_VAR = /var\(--lanpm-[^,)]+,\s*#[0-9a-fA-F]{3,8}/gi

const UI_COMPONENTS = [
  'ui/ViewHeader.tsx',
  'ui/IslandPanel.tsx',
  'ui/ViewToolbar.tsx',
  'ui/ViewState.tsx',
  'ui/cssVar.ts',
  'ui/regionInteract.module.css',
  'ui/RegionButton.tsx',
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
    pattern: /\.icon\s*\{[^}]*height:\s*var\(--lanpm-control-height-shell\)/s,
    label: 'RegionButton icon shell height token'
  },
  {
    file: 'ui/RegionButton.module.css',
    pattern: /\.text\s*\{[^}]*height:\s*var\(--lanpm-control-height-shell\)/s,
    label: 'RegionButton text shell height token'
  },
  {
    file: 'ui/RegionButton.module.css',
    pattern: /\.user\s*\{[^}]*height:\s*var\(--lanpm-control-height-shell\)/s,
    label: 'RegionButton user shell height token'
  },
  {
    file: 'layout/TopBar.module.css',
    pattern: /\.projectSelect\s*\{[^}]*height:\s*var\(--lanpm-control-height-shell\)/s,
    label: 'TopBar project select outer shell height token'
  },
  {
    file: 'layout/TopBar.module.css',
    pattern: /\.search:global\(\.ant-select-auto-complete\)/,
    label: 'TopBar search binds ant-select 32px'
  },
  {
    file: 'layout/GlobalSearch.module.css',
    pattern: /\.root:global\(\.ant-select-auto-complete\)/,
    label: 'GlobalSearch root binds ant-select 32px'
  },
  {
    file: 'layout/GlobalSearch.module.css',
    pattern: /\.root\s*:global\(\.ant-select-selector\)\s*\{[^}]*background:\s*var\(--lanpm-fill-secondary\)/s,
    label: 'GlobalSearch pill background on selector'
  },
  {
    file: 'layout/GlobalSearch.module.css',
    pattern: /\.input\s*\{[^}]*height:\s*var\(--lanpm-control-height-shell\)/s,
    label: 'GlobalSearch input shell height token'
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
    } else if (name.endsWith('.module.css')) {
      out.push(p)
    }
  }
  return out
}

function mustNotExist(rel: string): void {
  assert.ok(!existsSync(join(root, rel)), `legacy path should be removed: ${rel}`)
}

// --- tokens in global ---
const globalCss = readFileSync(join(renderer, 'styles/global.css'), 'utf8')
for (const theme of ["html[data-theme='light']", "html[data-theme='dark']"]) {
  const block = globalCss.includes(theme)
  assert.ok(block, `global.css missing ${theme}`)
}
for (const token of REQUIRED_FONT_TOKENS) {
  assert.ok(globalCss.includes(token), `global.css missing font token ${token}`)
}

assert.ok(globalCss.includes('--lanpm-motion-slow'), 'global.css must define --lanpm-motion-slow (SPRINT-25)')
assert.ok(
  globalCss.includes('@media (prefers-reduced-motion: reduce)'),
  'global.css must define prefers-reduced-motion fallback (SPRINT-25)'
)

for (const token of REQUIRED_TOKENS) {
  assert.ok(globalCss.includes(token), `global.css missing ${token} in both themes`)
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

// --- design token SSOT (global.css ↔ lanpmDesignTokens ↔ ThemeProvider) ---
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
assert.match(themeProviderSrc, /motionDurationMid/, 'ThemeProvider must align Ant motion tokens (SPRINT-25)')
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

// --- views use ViewHeader (cockpit only; group views use bottom nav) ---
for (const rel of ['views/CockpitView.tsx']) {
  const src = readFileSync(join(renderer, rel), 'utf8')
  assert.match(src, /ViewHeader/, `${rel} should use ViewHeader`)
}
const groupViewHeaderSrc = readFileSync(join(renderer, 'views/GroupView.tsx'), 'utf8')
assert.ok(
  !/import ViewHeader|<ViewHeader/.test(groupViewHeaderSrc),
  'GroupView must not render ViewHeader (docs/04 §1.4 · bottom-nav context)'
)

const cockpitSrc = readFileSync(join(renderer, 'views/CockpitView.tsx'), 'utf8')
const reportIdx = cockpitSrc.indexOf('cockpit.reportOutput')
const deptIdx = cockpitSrc.indexOf('cockpit.deptCompletion')
const execSummaryIdx = cockpitSrc.indexOf('styles.execSummary')
assert.ok(
  !/\bkpiGrid\b/.test(cockpitSrc),
  'CockpitView must not render a second kpiGrid island (CK-411)'
)
assert.ok(
  !/\bKpiTile\b/.test(cockpitSrc),
  'CockpitView must not use standalone KpiTile islands (CK-411)'
)
assert.ok(
  execSummaryIdx >= 0 && reportIdx >= 0 && execSummaryIdx < reportIdx,
  'Cockpit leadership summary must appear before report panel (CK-411)'
)
assert.ok(
  deptIdx >= 0 && reportIdx > deptIdx,
  'Cockpit report panel must follow department section (CK-408)'
)
assert.match(
  cockpitSrc,
  /variant="text"[\s\S]*<RobotOutlined/,
  'Cockpit AI evaluate must be secondary text CTA (CK-408)'
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
const islandPanelCss = readFileSync(join(renderer, 'ui/IslandPanel.module.css'), 'utf8')
const islandPanelSrc = readFileSync(join(renderer, 'ui/IslandPanel.tsx'), 'utf8')
assert.match(cockpitSrc, /IslandPanel/, 'CockpitView must use IslandPanel (SP-403)')
assert.match(islandPanelCss, /\.panel\b/, 'IslandPanel must define island panel styles (CK-412)')
assert.ok(
  !/\.kpiGrid\b/.test(cockpitCss) && !/\.kpiTile\b/.test(cockpitCss),
  'Cockpit CSS must drop dual-island kpiGrid/kpiTile (CK-411)'
)
assert.match(cockpitCss, /\.execValue\b/, 'Cockpit leadership summary must use custom typography')
assert.match(
  cockpitCss,
  /\.reportPreExpanded\s*\{[^}]*max-height:\s*min\(40dvh,\s*28rem\)/s,
  'Cockpit report expanded height must stay bounded (CK-402)'
)
assert.match(
  cockpitSrc,
  /executiveSummary/,
  'CockpitView must render executive summary fields (CK-403)'
)
assert.match(
  cockpitSrc,
  /cockpit\.totalProjects/,
  'Leadership summary must include project KPIs (CK-411)'
)
assert.match(
  cockpitSrc,
  /cockpit\.riskProjects/,
  'Leadership summary must include risk KPI (CK-411)'
)
assert.match(
  cockpitSrc,
  /attentionTasks/,
  'CockpitView must render attention task list (CK-404)'
)
assert.match(cockpitCss, /\.attentionTaskList\b/, 'Cockpit attention task list (CK-404)')
assert.match(cockpitCss, /\.execSummary\b/, 'Cockpit single leadership summary island (CK-411)')
assert.equal(
  (cockpitSrc.match(/styles\.execSummary\b/g) ?? []).length,
  1,
  'CockpitView must render exactly one leadership summary island (CK-411)'
)
assert.match(
  islandPanelSrc,
  /defaultCollapsed\??:/,
  'IslandPanel must support defaultCollapsed (CK-412)'
)
assert.match(
  islandPanelSrc,
  /onExpandedChange\??:/,
  'IslandPanel must support controlled onExpandedChange (CK-412)'
)
assert.match(
  islandPanelSrc,
  /summary\??:\s*React\.ReactNode/,
  'IslandPanel must expose summary slot (CK-412)'
)
assert.match(
  islandPanelSrc,
  /type="button"[\s\S]*?aria-expanded=\{expanded\}/,
  'IslandPanel toggle must be a button with aria-expanded (Enter/Space via native button, CK-412)'
)
assert.match(islandPanelCss, /\.panelToggle\b/, 'IslandPanel accordion toggle styles (CK-412)')
assert.match(islandPanelCss, /\.panelSummary\b/, 'IslandPanel summary slot styles (CK-412)')
assert.match(islandPanelCss, /\.panelChevron\b/, 'IslandPanel chevron styles (CK-412)')
assert.match(
  islandPanelCss,
  /\.panelChevron\s*\{[^}]*var\(--lanpm-font-body-secondary\)/s,
  'IslandPanel panelChevron must use font token (cockpit-delivery)'
)
assert.match(
  cockpitSrc,
  /title=\{t\('ai\.patrolTitle'\)\}[\s\S]*?defaultCollapsed/,
  'Cockpit patrol panel must default collapsed (cockpit-delivery)'
)
assert.match(
  cockpitSrc,
  /title=\{t\('ai\.pipeline\.title'\)\}[\s\S]*?defaultCollapsed/,
  'Cockpit pipeline panel must default collapsed (cockpit-delivery)'
)
assert.match(
  cockpitSrc,
  /data-testid="cockpit-report-panel"/,
  'Cockpit report panel must expose test id (cockpit-delivery)'
)
assert.match(
  cockpitSrc,
  /attentionTasksTitle[\s\S]*?defaultCollapsed/,
  'Attention tasks panel must default collapsed (CK-413)'
)
assert.match(
  cockpitSrc,
  /projectProgress[\s\S]*?defaultCollapsed/,
  'Project progress panel must default collapsed (CK-413)'
)
assert.match(
  cockpitSrc,
  /attentionPreview|slice\(0,\s*2\)/,
  'Attention summary must preview Top 2 only (CK-413)'
)
assert.match(
  cockpitSrc,
  /projectWorstSummary|worstProject/,
  'Project summary must show worst project (CK-413)'
)
assert.match(
  islandPanelSrc,
  /expanded \? <div className=\{bodyClass\}>/,
  'IslandPanel must hide detail children when aria-expanded=false (CK-413)'
)
assert.match(cockpitCss, /\.accordionSummary\b/, 'Accordion summary styles (CK-413)')
assert.match(
  cockpitSrc,
  /projectHealthList/,
  'CockpitView must render project health cards (CK-405)'
)
assert.match(cockpitCss, /\.projectHealthCard\b/, 'Cockpit project health card (CK-405)')
assert.match(
  cockpitCss,
  /\.projectHealthMetrics\b[^}]*:global\(\.ant-progress\)/s,
  'Project health progress bar must share row with meta (CK-405)'
)
assert.match(cockpitSrc, /deptList/, 'CockpitView must render dept list (CK-406)')
assert.match(
  cockpitSrc,
  /resolveDeptDoneCount/,
  'Cockpit must use dept doneCount fallback (CK-406)'
)
assert.match(
  cockpitSrc,
  /deptCompletion[\s\S]*?defaultCollapsed/,
  'Department panel must default collapsed (CK-414)'
)
assert.match(
  cockpitSrc,
  /deptSummary|worstDepartment/,
  'Department summary must show overall/worst dept (CK-414)'
)
assert.ok(
  !/\.deptList\b[^}]*overflow-y:\s*auto/s.test(cockpitCss),
  'Dept list must not nest vertical scroll by default (CK-410)'
)
assert.match(
  cockpitCss,
  /\.deptList\s*\{[^}]*overflow:\s*visible/s,
  'Dept list must overflow:visible so scrollBody owns vertical scroll (CK-414)'
)
assert.match(
  cockpitCss,
  /\.deptList\s*\{[^}]*max-height:\s*none/s,
  'Dept list must not cap height when expanded (CK-414)'
)
assert.match(
  cockpitCss,
  /\.scrollBody\s*\{[^}]*overflow-x:\s*clip/s,
  'Cockpit scrollBody must clip horizontal overflow (CK-410)'
)
assert.match(
  cockpitSrc,
  /data-lanpm-view-scroll/,
  'Cockpit scrollBody must be marked as view scroll container (CK-410)'
)
assert.match(
  cockpitSrc,
  /formatWeekOverWeekDelta/,
  'CockpitView must render week-over-week delta in executive summary (CK-407)'
)
assert.match(cockpitCss, /\.reportPanelTitle\b/, 'Cockpit report panel secondary title (CK-408)')
assert.match(cockpitCss, /\.reportTeaserButton\b/, 'Cockpit report teaser expand affordance (CK-408)')
assert.match(cockpitCss, /\.reportTeaser\b/, 'Cockpit collapsed report teaser (CK-402)')
assert.ok(
  !/\.root\s*\{[^}]*height:\s*100%/.test(cockpitCss),
  'CockpitView root must not lock height:100% (CK-401 scroll contract)'
)
assert.match(
  cockpitCss,
  /\.root\s*\{[^}]*overflow:\s*hidden/s,
  'CockpitView root must contain scroll in scrollBody (CK-401)'
)
assert.match(
  cockpitCss,
  /\.scrollBody\s*\{[^}]*flex:\s*1\s+1\s+0/s,
  'CockpitView scroll body must use flex 1 1 0 (CK-401)'
)
assert.match(
  cockpitCss,
  /\.scrollBody\s*\{[^}]*overflow-y:\s*auto/s,
  'CockpitView scroll body must be the vertical scroll container (CK-401)'
)
assert.match(
  cockpitCss,
  /\.scrollBody\s*>\s*\*\s*\{[^}]*flex-shrink:\s*0/s,
  'scrollBody children must not flex-shrink (expanded panels scroll via scrollBody, CK-410)'
)

const mainLayoutCss = readFileSync(join(renderer, 'layout/MainLayout.module.css'), 'utf8')
assert.match(mainLayoutCss, /\.mainCockpit\b/, 'MainLayout must define mainCockpit (CK-401)')
assert.match(
  mainLayoutCss,
  /\.mainCockpit\s*\{[^}]*overflow:\s*hidden/s,
  'mainCockpit must not scroll (CK-401)'
)
const mainLayoutSrc = readFileSync(join(renderer, 'layout/MainLayout.tsx'), 'utf8')
assert.match(
  mainLayoutCss,
  /\.mainCockpit\s*\{[^}]*flex:\s*1\s+1\s+0/s,
  'mainCockpit must participate in flex height chain (CK-410)'
)
assert.match(mainLayoutSrc, /mainCockpit/, 'MainLayout must apply mainCockpit on cockpit route (CK-401)')

// --- CK-415: density accordion suite still green (CK-410～414) ---
assert.ok(
  (cockpitSrc.match(/\bdefaultCollapsed\b/g) ?? []).length >= 3,
  'Cockpit must default-collapse attention/project/dept panels (CK-415)'
)
assert.ok(
  !/\bkpiGrid\b/.test(cockpitSrc) && !/\.kpiGrid\b/.test(cockpitCss),
  'CK-415: dual-island kpiGrid must stay banned (CK-411)'
)

const docs01 = readFileSync(join(root, 'docs/01_产品需求文档.md'), 'utf8')
const docs04 = readFileSync(join(root, 'docs/04_交互与UI约定.md'), 'utf8')
const docs05 = readFileSync(join(root, 'docs/05_测试与联调发布.md'), 'utf8')
assert.match(docs01, /领导摘要（单一岛）/, 'docs/01 §12.1 must describe single leadership summary (CK-415)')
assert.match(docs01, /手风琴/, 'docs/01 §12.1 must describe accordion list IA (CK-415)')
assert.match(docs01, /overflow-x:clip/, 'docs/01 scroll contract must mention overflow-x:clip (CK-415)')
assert.match(docs04, /手风琴/, 'docs/04 cockpit IA must mention accordion (CK-415)')
assert.match(docs04, /CK-401～415|CK-410～414/, 'docs/04 must reference density accordion guards (CK-415)')
assert.match(docs05, /列表手风琴/, 'docs/05 walkthrough must mention list accordion (CK-415)')
assert.match(docs04, /01_产品需求文档\.md/, 'docs/04 must link docs/01 §12.1 (CK-415)')
assert.match(docs01, /docs\/04/, 'docs/01 must cross-link docs/04 (CK-415)')

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
const calendarSrc = readFileSync(join(renderer, 'features/calendar/CalendarView.tsx'), 'utf8')
assert.match(
  calendarSrc,
  /IslandPanel[\s\S]*hideHeader/,
  'calendar island chrome via IslandPanel hideHeader (VP-406)'
)
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
  const isGlobal = rel === 'styles/global.css'
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

for (const rel of ['app/AppRouter.tsx'] as const) {
  const src = readFileSync(join(renderer, rel), 'utf8')
  assert.ok(!/\blazy\s*\(/.test(src), `${rel} must not use React.lazy (Rolldown CJS chunk cycle)`)
}
const groupViewSrc = readFileSync(join(renderer, 'views/GroupView.tsx'), 'utf8')
assert.ok(
  /\blazy\s*\(/.test(groupViewSrc),
  'GroupView should lazy-load Gantt/Calendar/Whiteboard (SPRINT-02-pack-size; chunkOptimization off)'
)

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
assert.ok(
  !/\.tabActive\s*\{[\s\S]*?background:/.test(bottomNavCss),
  'BottomNav tabActive must not use background block (docs/04 §1.6)'
)

const viewStateCss = readFileSync(join(renderer, 'ui/ViewState.module.css'), 'utf8')
assert.match(viewStateCss, /\.iconRing/, 'ViewState empty/loading icon ring (VP-407)')

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

// --- QA audit guards: font tokens + phantom CSS vars in TSX ---
const viewHeaderCss = readFileSync(join(renderer, 'ui/ViewHeader.module.css'), 'utf8')
assert.match(
  viewHeaderCss,
  /var\(--lanpm-font-title\)/,
  'ViewHeader title must use --lanpm-font-title token (TASK-579)'
)
assert.ok(
  !/font-size:\s*22px/.test(viewHeaderCss),
  'ViewHeader must not use hardcoded 22px title'
)

const subtaskPreviewModal = readFileSync(
  join(renderer, 'features/ai/SubtaskPreviewModal.tsx'),
  'utf8'
)
for (const phantom of FORBIDDEN_PHANTOM_TOKENS) {
  assert.ok(
    !subtaskPreviewModal.includes(phantom),
    `SubtaskPreviewModal must not use phantom token ${phantom}`
  )
}

// --- SP-401~405 spacing tokens + IslandPanel (design-tokens sprint) ---
const REQUIRED_SPACING_TOKENS = [
  '--lanpm-space-1',
  '--lanpm-space-3',
  '--lanpm-space-5',
  '--lanpm-space-6',
  '--lanpm-spacing-module',
  '--lanpm-spacing-panel-x'
] as const
for (const token of REQUIRED_SPACING_TOKENS) {
  assert.ok(globalCss.includes(token), `global.css missing spacing token ${token} (SP-401)`)
}
assert.ok(
  globalCss.includes('--lanpm-control-height-shell'),
  'global.css missing --lanpm-control-height-shell (shell height SSOT)'
)
assert.match(
  globalCss,
  /--lanpm-control-height-shell:\s*32px/,
  '--lanpm-control-height-shell must be 32px'
)
const spacingViewCss = [
  'views/CockpitView.module.css',
  'features/board/board.module.css',
  'features/calendar/calendar.module.css'
] as const
for (const rel of spacingViewCss) {
  const css = readFileSync(join(renderer, rel), 'utf8')
  assert.ok(
    css.includes('var(--lanpm-space-'),
    `${rel} must use --lanpm-space-* spacing tokens (SP-402)`
  )
  assert.ok(
    !/\bgap:\s*12px\b/.test(css),
    `${rel} must not use gap: 12px literal (SP-402)`
  )
  assert.ok(
    !/\bpadding:\s*12px\b/.test(css),
    `${rel} must not use padding: 12px literal (SP-402)`
  )
}
assert.match(islandPanelSrc, /export default function IslandPanel/, 'IslandPanel must be exported (SP-403)')
const boardSrc = readFileSync(join(renderer, 'features/board/BoardView.tsx'), 'utf8')
assert.match(boardSrc, /IslandPanel/, 'BoardView must import IslandPanel (SP-403)')
assert.match(
  islandPanelSrc,
  /defaultCollapsed\??:/,
  'IslandPanel must support defaultCollapsed (SP-404 / CK-412)'
)

// --- UC-401~404 unified-card sprint (IslandPanel rollout) ---
assert.match(islandPanelSrc, /hideHeader\??:/, 'IslandPanel must support hideHeader (UC-401)')
assert.match(
  boardSrc,
  /data-testid="board-column-island"/,
  'Board columns must use IslandPanel with board-column-island testid (UC-402)'
)
assert.ok(
  !/if \(status === 'todo'\)/.test(boardSrc),
  'BoardView must not branch columns on todo-only IslandPanel (UC-402)'
)
const treeSrc = readFileSync(join(renderer, 'features/tree/TaskTreeView.tsx'), 'utf8')
assert.match(calendarSrc, /hideHeader/, 'CalendarView must use IslandPanel hideHeader (UC-403)')
assert.match(
  calendarSrc,
  /data-testid="calendar-island-surface"/,
  'CalendarView must expose calendar-island-surface testid (UC-403)'
)
assert.match(treeSrc, /hideHeader/, 'TaskTreeView must use IslandPanel hideHeader (UC-403)')
assert.match(
  treeSrc,
  /data-testid="tree-island-surface"/,
  'TaskTreeView must expose tree-island-surface testid (UC-403)'
)
assert.ok(
  !boardCss.includes('.columnHeader'),
  'board.module.css must not retain legacy .columnHeader selectors (UC-404)'
)

// --- IS-401~404 island-surface-rollout sprint ---
const ganttSrc = readFileSync(join(renderer, 'features/gantt/GanttView.tsx'), 'utf8')
const filesSrc = readFileSync(join(renderer, 'features/files/FilesView.tsx'), 'utf8')
for (const [label, src] of [
  ['GanttView', ganttSrc],
  ['FilesView', filesSrc],
  ['ChatView', chatSrc]
] as const) {
  assert.match(src, /hideHeader/, `${label} must use IslandPanel hideHeader (IS-401)`)
}
assert.match(ganttSrc, /data-testid="gantt-island-surface"/, 'Gantt island surface testid (IS-402)')
assert.match(filesSrc, /data-testid="files-island-surface"/, 'Files island surface testid (IS-402)')
assert.match(chatSrc, /data-testid="chat-island-surface"/, 'Chat island surface testid (IS-402)')
const filesCss = readFileSync(join(renderer, 'features/files/files.module.css'), 'utf8')
const chartWrapBlock = ganttCss.match(/\.chartWrap\s*\{([^}]*)\}/)?.[1] ?? ''
const filesBodyBlock = filesCss.match(/\.body\s*\{([^}]*)\}/)?.[1] ?? ''
assert.ok(
  !chartWrapBlock.includes('box-shadow'),
  'gantt chartWrap must not define island box-shadow (IS-403)'
)
assert.ok(
  !filesBodyBlock.includes('box-shadow'),
  'files .body must not define island box-shadow (IS-403)'
)
assert.ok(
  !chatCss.includes('.chatWorkspaceDesktop'),
  'chat.module.css must not retain chatWorkspaceDesktop island chrome (IS-403)'
)
assert.match(docs04, /甘特、文件、聊天/, 'docs/04 §1.3.1 must list Gantt/Files/Chat island surfaces (IS-404)')
assert.match(docs04, /ChatCollaborationDrawer/, 'docs/04 must document chat collaboration drawer IA (IA-404)')
assert.match(docs04, /文件库 · 白板 · 脑图/, 'docs/04 must list collaboration composer buttons (IA-404)')

// --- AP-401~403 audit-polish（审查.md 清尾） ---
const discoverCoachmarkSrc = readFileSync(
  join(renderer, 'features/discover/DiscoverCoachmark.tsx'),
  'utf8'
)
const whiteboardCss = readFileSync(join(renderer, 'features/whiteboard/whiteboard.module.css'), 'utf8')
const taskDetailSrc = readFileSync(join(renderer, 'features/tree/TaskDetailPanel.tsx'), 'utf8')
const messageBubbleSrc = readFileSync(join(renderer, 'features/chat/MessageBubble.tsx'), 'utf8')
const whiteboardTypesSrc = readFileSync(join(root, 'src/shared/whiteboard/types.ts'), 'utf8')
const verifyM7Src = readFileSync(join(root, 'tests/runners/verify-m7.ts'), 'utf8')

assert.match(
  discoverCoachmarkSrc,
  /readCssVar\('--lanpm-overlay'/,
  'DiscoverCoachmark must use --lanpm-overlay token (AP-401)'
)
assert.match(
  whiteboardCss,
  /\.actionBtn[\s\S]*var\(--lanpm-shadow-island\)/,
  'whiteboard.actionBtn must use --lanpm-shadow-island (AP-401)'
)
assert.ok(
  !whiteboardCss.includes('rgba(0, 0, 0, 0.08)'),
  'whiteboard.module.css must not hardcode island shadow rgba (AP-401)'
)
assert.match(
  whiteboardTypesSrc,
  /LANPM_SURFACE_SOLID_HEX/,
  'whiteboard empty scene must use LANPM_SURFACE_SOLID_HEX (AP-402)'
)
assert.ok(!taskDetailSrc.includes('fontSize:'), 'TaskDetailPanel must not use inline fontSize (AP-403)')
assert.match(verifyM7Src, /npm run knip/, 'verify:m7 must run knip dead-code scan (AP-403)')

// --- CB-401~403 cockpit-button-unify ---
const regionButtonSrc = readFileSync(join(renderer, 'ui/RegionButton.tsx'), 'utf8')
const regionButtonCss = readFileSync(join(renderer, 'ui/RegionButton.module.css'), 'utf8')
const aiConfigSrc = readFileSync(join(renderer, 'features/cockpit/AiConfigModal.tsx'), 'utf8')
const cockpitAntImport = cockpitSrc.match(/import\s*\{([^}]+)\}\s*from\s*'antd'/)?.[1] ?? ''

assert.ok(!/\bButton\b/.test(cockpitAntImport), 'CockpitView must not import Ant Button (CB-401)')
assert.ok(!/<Button\b/.test(cockpitSrc), 'CockpitView must not render Ant Button (CB-401)')
const aiConfigAntImport = aiConfigSrc.match(/import\s*\{([^}]+)\}\s*from\s*'antd'/)?.[1] ?? ''
assert.ok(!/\bButton\b/.test(aiConfigAntImport), 'AiConfigModal must not import Ant Button (CB-401)')
assert.ok(!/<Button\b/.test(aiConfigSrc), 'AiConfigModal must not render Ant Button (CB-401)')
assert.match(regionButtonSrc, /loading\?:/, 'RegionButton must support loading prop (CB-402)')
assert.match(regionButtonSrc, /'emphasis'/, 'RegionButton must define emphasis variant (CB-402)')
assert.match(regionButtonCss, /\.emphasis\b/, 'RegionButton CSS must style emphasis variant (CB-402)')
assert.match(cockpitSrc, /variant="emphasis"/, 'CockpitView must use RegionButton emphasis for primary CTAs (CB-403)')
assert.ok(
  (cockpitSrc.match(/<RegionButton/g) ?? []).length >= 16,
  'CockpitView must migrate all header/panel buttons to RegionButton (CB-403)'
)

// --- CO-401~403 contrast-opacity-pass ---
const regionInteractCss = readFileSync(join(renderer, 'ui/regionInteract.module.css'), 'utf8')
const aiAssistantCss = readFileSync(join(renderer, 'features/ai/aiAssistant.module.css'), 'utf8')

assert.match(globalCss, /--lanpm-text-disabled:/, 'global.css must define --lanpm-text-disabled (CO-401)')
assert.ok(
  globalCss.includes("html[data-theme='light']") &&
    /--lanpm-text-disabled:[^;]+;[\s\S]*html\[data-theme='dark'\][\s\S]*--lanpm-text-disabled:/.test(
      globalCss
    ),
  'global.css must define --lanpm-text-disabled for light and dark (CO-401)'
)
assert.ok(
  !/\.regionDisabled\s*\{[^}]*opacity:/s.test(regionInteractCss),
  'regionDisabled must not use opacity (CO-402)'
)
assert.ok(
  !/\.tab:disabled\s*\{[^}]*opacity:/s.test(viewSegmentCss),
  'ViewSegment disabled tab must not use opacity (CO-402)'
)
assert.ok(
  !/\.tabDisabled\s*\{[^}]*opacity:/s.test(bottomNavCss),
  'BottomNav tabDisabled must not use opacity (CO-402)'
)
assert.ok(
  !/\.cardRelationDimmed\s*\{[^}]*opacity:/s.test(boardCss),
  'cardRelationDimmed must not use whole-card opacity (CO-403)'
)
assert.ok(
  !/\.promptRailItem:disabled\s*\{[^}]*opacity:/s.test(aiAssistantCss) &&
    !/\.promptChip:disabled\s*\{[^}]*opacity:/s.test(aiAssistantCss) &&
    !/\.sendIconBtn:disabled\s*\{[^}]*opacity:/s.test(aiAssistantCss),
  'aiAssistant disabled controls must not use opacity (CO-403)'
)
assert.ok(
  !/\.loadOlder\s*\{[^}]*opacity:/s.test(chatCss),
  'chat loadOlder must not stack opacity on secondary text (CO-403)'
)

// --- IA-401~403 chat-collaboration panels (SPRINT-15) ---
const collaborationDrawerSrc = readFileSync(
  join(renderer, 'features/chat/ChatCollaborationDrawer.tsx'),
  'utf8'
)
const collaborationStoreSrc = readFileSync(
  join(renderer, 'stores/chatCollaborationStore.ts'),
  'utf8'
)
assert.match(mainLayoutSrc, /ChatCollaborationDrawer/, 'MainLayout must mount ChatCollaborationDrawer (IA-401)')
assert.match(
  mainLayoutSrc,
  /!isDmGroupId\(groupId\)/,
  'ChatCollaborationDrawer must not mount in DM sessions (IA-401)'
)
assert.match(
  collaborationStoreSrc,
  /panel:\s*ChatCollaborationPanel \| null/,
  'chatCollaborationStore must track active panel (IA-401)'
)
assert.match(
  chatSrc,
  /toolbarMeetingGroup/,
  'ChatView composer must expose meeting toolbar group (IA-405)'
)
assert.match(
  chatSrc,
  /toolbarCollaborationGroup/,
  'ChatView composer must expose collaboration toolbar group (IA-402)'
)
assert.match(
  chatSrc,
  /openCollaborationPanel/,
  'ChatView must open collaboration panels from composer (IA-402)'
)
assert.match(
  collaborationDrawerSrc,
  /chat\.collaborationFullscreen/,
  'ChatCollaborationDrawer must offer fullscreen escape hatch (IA-403)'
)
assert.match(
  collaborationDrawerSrc,
  /contributedViewPath\(groupId,\s*'mindmap'\)/,
  'mindmap fullscreen must use contributed deep link (IA-403)'
)
assert.match(
  taskDetailSrc,
  /openFilesCollaborationPanel/,
  'TaskDetailPanel must open files panel via collaboration helper (IA-403)'
)
assert.match(
  taskDetailSrc,
  /openWhiteboardCollaborationPanel/,
  'TaskDetailPanel must open whiteboard via collaboration drawer (IA-407)'
)
assert.match(
  collaborationDrawerSrc,
  /WhiteboardView embedded/,
  'whiteboard in drawer must use embedded mode (IA-405)'
)
assert.match(
  chatCss,
  /collaborationPanelCanvas/,
  'chat.module.css must define collaborationPanelCanvas overflow (IA-405)'
)

assert.match(
  messageBubbleSrc,
  /openFilesCollaborationPanel\(fileId\)/,
  'MessageBubble must open files via collaboration drawer with fileId (IA-406)'
)

const visualCaptureSrc = readFileSync(join(root, 'src/main/visualCapture.ts'), 'utf8')
assert.match(
  visualCaptureSrc,
  /COLLAB_DRAWER_SLUGS/,
  'visualCapture must capture files/whiteboard/mindmap via chat drawer (IA-408 TASK-1223)'
)
assert.match(
  visualCaptureSrc,
  /captureCollabDrawerPages/,
  'visualCapture must implement chat+drawer screenshot flow (IA-408)'
)
assert.match(
  chatSrc,
  /data-visual-collab/,
  'ChatView collaboration buttons must expose data-visual-collab (IA-408)'
)
assert.match(
  collaborationDrawerSrc,
  /visualCollabDrawer/,
  'ChatCollaborationDrawer must set dataset.visualCollabDrawer for capture (IA-408)'
)
assert.match(
  chatCss,
  /collaborationDrawerWhiteboard/,
  'chat.module.css must scope whiteboard transform:none to collaborationDrawerWhiteboard (SPRINT-25)'
)
assert.match(
  chatCss,
  /collaborationPanelReady/,
  'chat.module.css must fade-in collaboration panel content (SPRINT-25)'
)

// --- IA-409 bottom nav overflow slot (ia-regression TASK-1311) ---
const bottomNavSrc = readFileSync(join(renderer, 'layout/BottomNav.tsx'), 'utf8')
assert.match(
  bottomNavSrc,
  /if \(plugins\.length === 0\) return null/,
  'BottomNav overflow slot must not render empty flex tabSlot (IA-409)'
)

// --- production bundle: global design tokens must ship (global.css, not dev-only) ---
const outAssets = join(root, 'out/renderer/assets')
if (existsSync(outAssets)) {
  const globalProdCss = readdirSync(outAssets).find(
    (name) => name.startsWith('global-') && name.endsWith('.css')
  )
  assert.ok(globalProdCss, 'production build must emit global-*.css from styles/global.css')
  const prodCss = readFileSync(join(outAssets, globalProdCss), 'utf8')
  assert.ok(
    prodCss.includes('--lanpm-border:'),
    `production ${globalProdCss} must define --lanpm-border`
  )
  assert.ok(
    prodCss.includes("html[data-theme='light']"),
    `production ${globalProdCss} must include light theme token block`
  )
  const indexHtml = join(root, 'out/renderer/index.html')
  if (existsSync(indexHtml)) {
    const html = readFileSync(indexHtml, 'utf8')
    assert.ok(
      html.includes(globalProdCss),
      'out/renderer/index.html must link global design-token stylesheet'
    )
  }
}

console.log(
  'verify:visual OK',
  `(${REQUIRED_TOKENS.length}+${REQUIRED_FONT_TOKENS.length} tokens, ${UI_COMPONENTS.length} ui modules, ${SEVEN_PAGE_VIEWS.length} page views, ${scanned} css files)`
)
