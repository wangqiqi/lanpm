/**
 * TASK-836 — ViewHost M1.5：7 核心 Tab toolbar zone 锚点 + viewSlotMap SSOT。
 * Run: npm run verify:view-slot-hosts
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { PLUGIN_SLOT_IDS } from '../../src/shared/plugin/types.ts'
import { VIEW_SLOT_MAP } from '../../src/renderer/src/plugin/viewSlotMap.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const CORE_VIEWS = [
  'chat',
  'board',
  'tree',
  'gantt',
  'calendar',
  'whiteboard',
  'files'
] as const

const VIEW_FILES: Record<(typeof CORE_VIEWS)[number], string> = {
  chat: 'src/renderer/src/features/chat/ChatView.tsx',
  board: 'src/renderer/src/features/board/BoardView.tsx',
  tree: 'src/renderer/src/features/tree/TaskTreeView.tsx',
  gantt: 'src/renderer/src/features/gantt/GanttView.tsx',
  calendar: 'src/renderer/src/features/calendar/CalendarView.tsx',
  whiteboard: 'src/renderer/src/features/whiteboard/WhiteboardView.tsx',
  files: 'src/renderer/src/features/files/FilesView.tsx'
}

assert.ok(existsSync(join(root, 'src/shared/plugin/viewHost.ts')), 'missing viewHost.ts')
assert.ok(existsSync(join(root, 'src/renderer/src/plugin/viewSlotMap.ts')), 'missing viewSlotMap.ts')
assert.ok(existsSync(join(root, 'src/renderer/src/plugin/PluginSlot.tsx')), 'missing PluginSlot.tsx')

const viewHost = readFileSync(join(root, 'src/shared/plugin/viewHost.ts'), 'utf8')
assert.match(viewHost, /export type ViewPluginZone/)
assert.match(viewHost, /export type ViewPluginContext/)
assert.match(viewHost, /export type PluginSlotHostProps/)

const pluginSlot = readFileSync(join(root, 'src/renderer/src/plugin/PluginSlot.tsx'), 'utf8')
assert.match(pluginSlot, /export function PluginSlotHost/)
assert.match(pluginSlot, /export function PluginZoneHost/)
assert.match(pluginSlot, /export function PluginGroupSlot/)
assert.match(pluginSlot, /export function PluginTaskSlot/)

const plannedSlots = [
  'chat.toolbar.media',
  'chat.composer.action',
  'chat.message.action',
  'board.toolbar',
  'board.card.footer',
  'tree.toolbar',
  'gantt.toolbar',
  'gantt.bar.context',
  'calendar.toolbar',
  'calendar.event.action',
  'whiteboard.toolbar',
  'files.toolbar'
] as const

for (const slot of plannedSlots) {
  assert.ok(PLUGIN_SLOT_IDS.includes(slot), `PLUGIN_SLOT_IDS missing ${slot}`)
}

for (const view of CORE_VIEWS) {
  const toolbarSlots = VIEW_SLOT_MAP[view]?.toolbar
  assert.ok(toolbarSlots && toolbarSlots.length > 0, `viewSlotMap missing toolbar for ${view}`)

  const rel = VIEW_FILES[view]
  const abs = join(root, rel)
  assert.ok(existsSync(abs), `missing view file ${rel}`)
  const src = readFileSync(abs, 'utf8')
  assert.match(src, /PluginZoneHost/, `${rel} must use PluginZoneHost`)
  assert.match(src, /zone="toolbar"/, `${rel} must wire toolbar zone`)
  assert.match(src, new RegExp(`view:\\s*'${view}'`), `${rel} must pass view: '${view}'`)
}

const detail = readFileSync(
  join(root, 'src/renderer/src/features/tree/TaskDetailPanel.tsx'),
  'utf8'
)
assert.match(detail, /PluginSlot/)
assert.match(detail, /task\.detail\.section/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:view-slot-hosts'], 'missing verify:view-slot-hosts script')

console.log('verify:view-slot-hosts OK')
