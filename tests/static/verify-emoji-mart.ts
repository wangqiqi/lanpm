/**
 * TASK-5201 — Composer emoji picker uses emoji-mart (MIT), not a custom grid.
 * Run: npm run verify:emoji-mart
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

assert.ok(pkg.scripts?.['verify:emoji-mart'], 'missing verify:emoji-mart script')
assert.ok(
  pkg.dependencies?.['emoji-mart'] || pkg.devDependencies?.['emoji-mart'],
  'emoji-mart must be a package dependency'
)
assert.ok(
  pkg.dependencies?.['@emoji-mart/react'] || pkg.devDependencies?.['@emoji-mart/react'],
  '@emoji-mart/react must be a package dependency'
)
assert.ok(
  pkg.dependencies?.['@emoji-mart/data'] || pkg.devDependencies?.['@emoji-mart/data'],
  '@emoji-mart/data must be a package dependency'
)

for (const name of ['emoji-mart', '@emoji-mart/react', '@emoji-mart/data'] as const) {
  const license = JSON.parse(
    readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8')
  ) as { license?: string }
  assert.equal(license.license, 'MIT', `${name} must be MIT`)
}

const picker = readFileSync(
  join(root, 'src/renderer/src/features/chat/EmojiPicker.tsx'),
  'utf8'
)
assert.match(picker, /from '@emoji-mart\/react'/)
assert.match(picker, /from '@emoji-mart\/data'/)
assert.match(picker, /set="native"/)
assert.doesNotMatch(picker, /EMOJI_GROUPS/)
assert.doesNotMatch(picker, /from '\.\/emojiData'/)

assert.ok(!existsSync(join(root, 'src/renderer/src/features/chat/emojiData.ts')), 'emojiData.ts must be removed')

const chatView = readFileSync(
  join(root, 'src/renderer/src/features/chat/ChatView.tsx'),
  'utf8'
)
assert.match(chatView, /<EmojiPicker onPick=\{insertEmoji\} \/>/)

console.log('verify-emoji-mart: emoji-mart MIT + Composer wrapper OK')
