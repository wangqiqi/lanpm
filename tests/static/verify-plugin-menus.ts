/**
 * TASK-1028 — Plugin menus[] POC guards.
 * Run: npm run verify:plugin-menus
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const menus = readFileSync(join(root, 'src/shared/plugin/menus.ts'), 'utf8')
assert.match(menus, /PluginMenu/)
assert.match(menus, /ListedMenuItem/)
assert.match(menus, /resolveMenuCommandId/)
assert.match(menus, /topbar\.user/)
assert.match(menus, /chat\.message\.context/)

const types = readFileSync(join(root, 'src/shared/plugin/types.ts'), 'utf8')
assert.match(types, /menus\?:/)

const validate = readFileSync(join(root, 'src/shared/plugin/validateManifest.ts'), 'utf8')
assert.match(validate, /parseMenus/)

const registry = readFileSync(join(root, 'src/main/plugin/menuRegistry.ts'), 'utf8')
assert.match(registry, /listPluginMenusFromDiscover/)
assert.match(registry, /listAllMenus/)

const discover = readFileSync(join(root, 'src/main/plugin/discover.ts'), 'utf8')
assert.match(discover, /export function listMenus/)

const channels = readFileSync(join(root, 'src/shared/plugin/channels.ts'), 'utf8')
assert.match(channels, /listMenus/)

const ipc = readFileSync(join(root, 'src/main/ipc/plugin.ts'), 'utf8')
assert.match(ipc, /PLUGIN_IPC\.listMenus/)

const preload = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
assert.match(preload, /listMenus/)

const api = readFileSync(join(root, 'src/shared/lanpm-api.ts'), 'utf8')
assert.match(api, /listMenus/)

const hook = readFileSync(join(root, 'src/renderer/src/plugin/usePluginMenus.ts'), 'utf8')
assert.match(hook, /usePluginMenus/)
assert.match(hook, /invokeCommand/)
assert.match(hook, /applyCommandAction/)

const topBar = readFileSync(join(root, 'src/renderer/src/layout/TopBar.tsx'), 'utf8')
assert.match(topBar, /usePluginMenus\('topbar\.user'\)/)

const bubble = readFileSync(join(root, 'src/renderer/src/features/chat/MessageBubble.tsx'), 'utf8')
assert.match(
  bubble,
  /useChatPluginMenuItems\('chat\.message\.context'\)|usePluginMenus\('chat\.message\.context'\)/
)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
assert.match(stub, /listMenus/)
assert.match(stub, /listStubMenus/)

const example = JSON.parse(
  readFileSync(join(root, 'plugins/lanpm.example/plugin.json'), 'utf8')
) as { menus?: Array<{ location: string }> }
assert.ok(Array.isArray(example.menus) && example.menus.length > 0)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:plugin-menus'], 'missing verify:plugin-menus script')

assert.ok(existsSync(join(root, 'tests/unit/plugin/menuRegistry.test.ts')))
assert.ok(existsSync(join(root, 'tests/unit/plugin/validateManifest.test.ts')))

console.log('verify:plugin-menus OK')
