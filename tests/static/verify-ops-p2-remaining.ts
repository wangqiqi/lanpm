/**
 * ops-p2-remaining — Ops assistant bot · outbound watch · task link guards.
 * Run: npm run verify:ops-p2-remaining
 */
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:ops-p2-remaining'], 'missing verify:ops-p2-remaining script')
assert.ok(pkg.dependencies?.chokidar, 'missing chokidar dependency')

execSync('npm run verify:ops-p3', { cwd: root, stdio: 'inherit' })

assert.ok(existsSync(join(root, 'src/shared/ops/bot.ts')))
assert.ok(existsSync(join(root, 'src/main/ops/opsBotService.ts')))
assert.ok(existsSync(join(root, 'src/main/ops/outboundWatchService.ts')))
assert.ok(existsSync(join(root, 'src/main/ops/opsGroupSettingsStore.ts')))
assert.ok(existsSync(join(root, 'src/renderer/src/features/ops/OpsAssistantPanel.tsx')))

const members = readFileSync(join(root, 'src/shared/chat/members.ts'), 'utf8')
assert.match(members, /deviceKind\?: 'human' \| 'machine' \| 'bot'/)

const types = readFileSync(join(root, 'src/shared/chat/types.ts'), 'utf8')
assert.match(types, /'ops-bot'/)

const botService = readFileSync(join(root, 'src/main/ops/opsBotService.ts'), 'utf8')
assert.match(botService, /OPS_BOT_REPLY_MAX_CHARS/)
assert.match(botService, /meta: \{ source: 'ops-bot'/)

const watch = readFileSync(join(root, 'src/main/ops/outboundWatchService.ts'), 'utf8')
assert.match(watch, /chokidar/)
assert.match(watch, /THROTTLE_MS/)

const channels = readFileSync(join(root, 'src/shared/ops/channels.ts'), 'utf8')
assert.match(channels, /ops:getGroupSettings/)
assert.match(channels, /ops:updateGroupSettings/)

const opsCommand = readFileSync(join(root, 'src/shared/chat/opsCommand.ts'), 'utf8')
assert.match(opsCommand, /suggestOpsSlashCompletion/)

const taskLink = readFileSync(join(root, 'src/main/ops/opsTaskLinkService.ts'), 'utf8')
assert.match(taskLink, /appendTaskOpsNote/)

const featureDoc = readFileSync(join(root, 'docs/07_插件与扩展.md'), 'utf8')
assert.match(featureDoc, /verify:ops-p2-remaining/)

console.log('verify:ops-p2-remaining OK')
