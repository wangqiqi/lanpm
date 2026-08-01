/**
 * TASK-1225 — Plugin UI surface guards (Profile tab · task.detail.section · formjs).
 * Run: npm run verify:plugin-ui-surfaces
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'
import { GLOBAL_SLOT_HOST_FILES } from '../../src/renderer/src/plugin/viewSlotMap.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readSrc(rel: string): string {
  const abs = join(root, rel)
  assert.ok(existsSync(abs), `missing ${rel}`)
  return readFileSync(abs, 'utf8')
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:plugin-ui-surfaces'], 'missing verify:plugin-ui-surfaces script')

// --- Profile plugin tab surfaces ---
const profileModal = readSrc('src/renderer/src/features/profile/ProfileModal.tsx')
assert.match(profileModal, /data-plugin-slot=["']profile\.tab["']/, 'ProfileModal must expose profile.tab anchor')
assert.match(profileModal, /useProfileTabPlugins/, 'ProfileModal must load profile.tab plugins')
assert.match(profileModal, /PluginProfileTabBody/, 'ProfileModal must render profile tab plugin bodies')
assert.match(profileModal, /profileTabPlugins\.map/, 'ProfileModal must append dynamic plugin tabs')
assert.match(profileModal, /key:\s*['"]plugins['"]/, 'ProfileModal must keep built-in plugins settings tab')
assert.match(profileModal, /<PluginsPanel\s*\/>/, 'ProfileModal plugins tab must mount PluginsPanel')

const profileHost = GLOBAL_SLOT_HOST_FILES['profile.tab']
assert.equal(
  profileHost,
  'src/renderer/src/features/profile/ProfileModal.tsx',
  'viewSlotMap profile.tab host must be ProfileModal'
)

const pluginsPanel = readSrc('src/renderer/src/features/profile/PluginsPanel.tsx')
assert.match(pluginsPanel, /className=\{styles\.root\}/, 'PluginsPanel must render root container')
assert.match(pluginsPanel, /className=\{styles\.list\}/, 'PluginsPanel must render plugin list')

// --- task.detail.section hosts (tree + board parity) ---
const taskDetail = readSrc('src/renderer/src/features/tree/TaskDetailPanel.tsx')
assert.match(
  taskDetail,
  /slotId=["']task\.detail\.section["']/,
  'TaskDetailPanel must mount task.detail.section'
)
assert.match(taskDetail, /<PluginSlot\b/, 'TaskDetailPanel must use PluginSlot for task detail plugins')

const taskEdit = readSrc('src/renderer/src/features/board/TaskEditModal.tsx')
assert.match(
  taskEdit,
  /slot=["']task\.detail\.section["']/,
  'TaskEditModal must mount task.detail.section'
)
assert.match(taskEdit, /<PluginTaskSlot\b/, 'TaskEditModal must use PluginTaskSlot')
assert.match(taskEdit, /showSectionLabel/, 'TaskEditModal must show plugin section label')

const pluginSlot = readSrc('src/renderer/src/plugin/PluginSlot.tsx')
assert.match(pluginSlot, /data-plugin-slot=\{slot\}/, 'PluginSlotHost must stamp data-plugin-slot')
assert.match(pluginSlot, /showSectionLabel \? .*plugin\.slotSection/, 'PluginSlotHost must label extension section')

for (const locale of ['zh-CN.ts', 'en-US.ts'] as const) {
  const src = readSrc(`src/renderer/src/i18n/locales/${locale}`)
  assert.match(src, /['"]plugin\.slotSection['"]:/, `${locale} must define plugin.slotSection`)
}

// --- formjs task.detail.section visual surface ---
const formjsManifest = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.formjs/plugin.json'), 'utf8')
) as { slots?: string[] }
assert.ok(
  formjsManifest.slots?.includes('task.detail.section'),
  'lanpm.formjs must declare task.detail.section'
)

const formJsView = readSrc('src/renderer/src/plugin/builtins/FormJsView.tsx')
assert.match(formJsView, /data-formjs-engine=["']bpmn["']/, 'FormJsView must expose data-formjs-engine marker')
assert.match(formJsView, /data-formjs-container/, 'FormJsView must expose form container hook')
assert.match(formJsView, /styles\.formJsHost/, 'FormJsView must use formJsHost layout class')
assert.match(formJsView, /styles\.card/, 'FormJsView must use plugin card chrome')

const pluginCss = readSrc('src/renderer/src/plugin/plugin.module.css')
assert.match(pluginCss, /\.formJsHost\b/, 'plugin.module.css must define formJsHost')
assert.match(pluginCss, /var\(--lanpm-border\)/, 'plugin card chrome must use design tokens')
assert.doesNotMatch(pluginCss, /#[0-9a-fA-F]{3,8}/, 'plugin.module.css must not hardcode hex colors')

const registry = readSrc('src/renderer/src/plugin/registry.ts')
assert.match(registry, /lanpm\.formjs.*FormJsView/, 'registry must map lanpm.formjs to FormJsView')

console.log('verify:plugin-ui-surfaces OK')
