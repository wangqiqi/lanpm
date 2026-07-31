/**
 * TASK-950 / TASK-975 — Command palette guards.
 * Run: npm run verify:command-palette
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const commands = readFileSync(join(root, 'src/shared/plugin/commands.ts'), 'utf8')
assert.match(commands, /PluginCommand/)
assert.match(commands, /ListedCommand/)
assert.match(commands, /InvokeCommandResult/)
assert.match(commands, /CommandAction/)
assert.match(commands, /resolveCommandAction/)

const types = readFileSync(join(root, 'src/shared/plugin/types.ts'), 'utf8')
assert.match(types, /commands\?:/)

const validate = readFileSync(join(root, 'src/shared/plugin/validateManifest.ts'), 'utf8')
assert.match(validate, /parseCommands/)

const registry = readFileSync(join(root, 'src/main/plugin/commandRegistry.ts'), 'utf8')
assert.match(registry, /CORE_COMMANDS/)
assert.match(registry, /listAllCommands/)
assert.match(registry, /invokeListedCommand/)
assert.doesNotMatch(registry, /stub/)

const discover = readFileSync(join(root, 'src/main/plugin/discover.ts'), 'utf8')
assert.match(discover, /export function listCommands/)

const channels = readFileSync(join(root, 'src/shared/plugin/channels.ts'), 'utf8')
assert.match(channels, /listCommands/)
assert.match(channels, /invokeCommand/)

const ipc = readFileSync(join(root, 'src/main/ipc/plugin.ts'), 'utf8')
assert.match(ipc, /PLUGIN_IPC\.listCommands/)
assert.match(ipc, /PLUGIN_IPC\.invokeCommand/)

const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preload, /listCommands/)
assert.match(preload, /invokeCommand/)

const api = readFileSync(join(root, 'src/shared/lanpm-api.ts'), 'utf8')
assert.match(api, /listCommands/)
assert.match(api, /invokeCommand/)

const effects = readFileSync(join(root, 'src/renderer/src/plugin/commandEffects.ts'), 'utf8')
assert.match(effects, /applyCommandAction/)
assert.match(effects, /LANPM_OPEN_PROFILE_EVENT/)

const handlerRegistry = readFileSync(
  join(root, 'src/renderer/src/plugin/commandHandlerRegistry.ts'),
  'utf8'
)
assert.match(handlerRegistry, /runPluginCommandHandler/)
assert.match(handlerRegistry, /lanpm\.example:hello/)

const palette = readFileSync(join(root, 'src/renderer/src/layout/CommandPalette.tsx'), 'utf8')
assert.match(palette, /isPaletteHotkey|metaKey/)
assert.match(palette, /listCommands/)
assert.match(palette, /invokeCommand/)
assert.match(palette, /applyCommandAction/)
assert.doesNotMatch(palette, /LANPM_OPEN_PROFILE_EVENT/)

const layout = readFileSync(join(root, 'src/renderer/src/layout/MainLayout.tsx'), 'utf8')
assert.match(layout, /CommandPalette/)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
assert.match(stub, /listCommands/)
assert.match(stub, /invokeCommand/)
assert.match(stub, /resolveCommandAction/)
assert.doesNotMatch(stub, /plugin stub|core stub/)

const example = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.example/plugin.json'), 'utf8')
) as { commands?: Array<{ id: string }> }
assert.ok(Array.isArray(example.commands) && example.commands.length > 0)

const zh = readFileSync(join(root, 'src/renderer/src/i18n/locales/zh-CN.ts'), 'utf8')
assert.match(zh, /command\.paletteTitle/)
assert.match(zh, /command\.example\.hello/)
assert.match(zh, /command\.example\.helloDone/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:command-palette'], 'missing verify:command-palette script')

assert.ok(existsSync(join(root, 'tests/unit/plugin/commandRegistry.test.ts')))
assert.ok(existsSync(join(root, 'tests/unit/plugin/validateManifest.test.ts')))

console.log('verify:command-palette OK')
