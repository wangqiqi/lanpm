/**
 * ViewHost M1.5+ — viewSlotMap SSOT · 全 zone 锚点 + toolbar 基线。
 * Run: npm run verify:view-slot-hosts
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import type { AppView } from '../../src/shared/navigation/types.ts'
import type { ViewPluginZone } from '../../src/shared/plugin/viewHost.ts'
import { PLUGIN_SLOT_IDS } from '../../src/shared/plugin/types.ts'
import { VIEW_SLOT_MAP, GLOBAL_SLOT_HOST_FILES } from '../../src/renderer/src/plugin/viewSlotMap.ts'
import { GLOBAL_PLUGIN_SLOT_IDS } from '../../src/shared/plugin/viewHost.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const CORE_VIEWS = [
  'chat',
  'board',
  'tree',
  'gantt',
  'calendar',
  'whiteboard',
  'files'
] as const satisfies readonly AppView[]

const VIEW_FILES: Record<(typeof CORE_VIEWS)[number], string> = {
  chat: 'src/renderer/src/features/chat/ChatView.tsx',
  board: 'src/renderer/src/features/board/BoardView.tsx',
  tree: 'src/renderer/src/features/tree/TaskTreeView.tsx',
  gantt: 'src/renderer/src/features/gantt/GanttView.tsx',
  calendar: 'src/renderer/src/features/calendar/CalendarView.tsx',
  whiteboard: 'src/renderer/src/features/whiteboard/WhiteboardView.tsx',
  files: 'src/renderer/src/features/files/FilesView.tsx'
}

/** zone 接线落点与主视图文件不一致时在此登记 */
const ZONE_FILE_OVERRIDES: Partial<
  Record<AppView, Partial<Record<ViewPluginZone, string | readonly string[]>>>
> = {
  chat: { context: 'src/renderer/src/features/chat/ChatView.tsx' },
  board: {
    card: 'src/renderer/src/features/board/KanbanCard.tsx',
    detail: 'src/renderer/src/features/board/TaskEditModal.tsx'
  },
  tree: { detail: 'src/renderer/src/features/tree/TaskDetailPanel.tsx' }
}

function readSrc(rel: string): string {
  const abs = join(root, rel)
  assert.ok(existsSync(abs), `missing file ${rel}`)
  return readFileSync(abs, 'utf8')
}

function zoneFiles(view: AppView, zone: ViewPluginZone): string[] {
  const override = ZONE_FILE_OVERRIDES[view]?.[zone]
  if (override) return Array.isArray(override) ? [...override] : [override]
  return [VIEW_FILES[view as (typeof CORE_VIEWS)[number]]]
}

function assertZoneWired(view: AppView, zone: ViewPluginZone, rel: string, src: string): void {
  if (zone === 'detail') {
    const hasZoneHost =
      /PluginZoneHost/.test(src) && new RegExp(`zone="${zone}"`).test(src)
    const hasTaskDetailSlot =
      /task\.detail\.section/.test(src) &&
      (/PluginTaskSlot/.test(src) || /PluginSlot/.test(src))
    assert.ok(
      hasZoneHost || hasTaskDetailSlot,
      `${rel} must wire detail zone for view '${view}'`
    )
    if (hasZoneHost) {
      assert.match(src, new RegExp(`view:\\s*'${view}'`), `${rel} must pass view: '${view}'`)
    }
    return
  }

  assert.match(
    src,
    /PluginZoneHost|PluginTaskSlot|PluginSlotHost/,
    `${rel} must use PluginZoneHost (or task slot) for zone '${zone}'`
  )
  assert.match(src, new RegExp(`zone="${zone}"`), `${rel} must wire zone="${zone}"`)
  assert.match(src, new RegExp(`view:\\s*'${view}'`), `${rel} must pass view: '${view}'`)
}

assert.ok(existsSync(join(root, 'src/shared/plugin/viewHost.ts')), 'missing viewHost.ts')
assert.ok(existsSync(join(root, 'src/renderer/src/plugin/viewSlotMap.ts')), 'missing viewSlotMap.ts')
assert.ok(existsSync(join(root, 'src/renderer/src/plugin/PluginSlot.tsx')), 'missing PluginSlot.tsx')

const viewHost = readSrc('src/shared/plugin/viewHost.ts')
assert.match(viewHost, /export type ViewPluginZone/)
assert.match(viewHost, /export type ViewPluginContext/)
assert.match(viewHost, /zone\?:\s*ViewPluginZone/)
assert.match(viewHost, /export type PluginSlotHostProps/)
assert.match(viewHost, /export type GlobalPluginSlotId/)
assert.match(viewHost, /export type PluginGlobalSlotProps/)

const pluginSlot = readSrc('src/renderer/src/plugin/PluginSlot.tsx')
assert.match(pluginSlot, /export function PluginSlotHost/)
assert.match(pluginSlot, /export function PluginZoneHost/)
assert.match(pluginSlot, /\{\s*\.\.\.context,\s*zone\s*\}/)
assert.match(pluginSlot, /export function PluginGroupSlot/)
assert.match(pluginSlot, /export function PluginTaskSlot/)
assert.match(pluginSlot, /export function PluginGlobalSlot/)

const allMappedSlots = new Set<string>()
for (const view of CORE_VIEWS) {
  const zones = VIEW_SLOT_MAP[view]
  assert.ok(zones, `VIEW_SLOT_MAP missing view ${view}`)
  for (const [zone, slots] of Object.entries(zones) as [
    ViewPluginZone,
    readonly string[] | undefined
  ][]) {
    if (!slots?.length) continue
    for (const slot of slots) {
      allMappedSlots.add(slot)
      assert.ok(PLUGIN_SLOT_IDS.includes(slot), `PLUGIN_SLOT_IDS missing ${slot}`)
    }
    for (const rel of zoneFiles(view, zone)) {
      assertZoneWired(view, zone, rel, readSrc(rel))
    }
  }
}

assert.ok(allMappedSlots.has('task.detail.section'), 'viewSlotMap must map task.detail.section')

for (const slot of GLOBAL_PLUGIN_SLOT_IDS) {
  const rel = GLOBAL_SLOT_HOST_FILES[slot]
  assert.ok(rel, `GLOBAL_SLOT_HOST_FILES missing ${slot}`)
  const src = readSrc(rel)
  assert.match(
    src,
    new RegExp(`data-plugin-slot=["']${slot}["']|slot="${slot}"`),
    `${rel} must wire global slot ${slot}`
  )
  assert.match(
    src,
    /PluginGlobalSlot|PluginSlotHost|PluginProfileTabBody|useProfileTabPlugins/,
    `${rel} must use PluginGlobalSlot or profile tab host for ${slot}`
  )
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:view-slot-hosts'], 'missing verify:view-slot-hosts script')

const chatView = readSrc('src/renderer/src/features/chat/ChatView.tsx')
const voicePanel = readSrc('src/renderer/src/features/chat/ChatVoiceMediaPanel.tsx')
const chatCss = readSrc('src/renderer/src/features/chat/chat.module.css')

assert.match(
  chatView,
  /toolbarMeetingGroup[\s\S]*PluginZoneHost zone="toolbar"/,
  'ChatView composer toolbar must host meeting toolbar zone'
)
assert.doesNotMatch(
  chatView,
  /inputMode\s*===\s*['"]text['"][\s\S]*PluginZoneHost[\s\S]*zone="toolbar"/,
  'meeting toolbar must not be gated to text mode only'
)
assert.match(voicePanel, /chat-voice-hold-btn/, 'ChatVoiceMediaPanel must host PTT voice UI')
assert.doesNotMatch(voicePanel, /zone="toolbar"/, 'ChatVoiceMediaPanel must not host toolbar zone')
assert.ok(
  !voicePanel.includes('PluginGroupSlot'),
  'ChatVoiceMediaPanel must not use PluginGroupSlot (no dual toolbar mount)'
)

const exampleStub = readSrc('src/renderer/src/plugin/builtins/ExampleStub.tsx')
const meetingToolbar = readSrc('src/renderer/src/plugin/builtins/MeetingToolbar.tsx')
assert.match(exampleStub, /zone\s*!==\s*['"]composer['"]/)
assert.match(meetingToolbar, /zone\s*!==\s*['"]toolbar['"]/)

assert.match(
  chatCss,
  /\.chatIsland\s+\.chatWorkspace[\s\S]*flex-direction:\s*row/,
  'chat island workspace must restore row layout (sidebar + main)'
)

console.log('verify:view-slot-hosts OK')
