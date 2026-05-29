/**
 * DOC-F-04：顶栏 Profile 入口可打开只读面板（非 disabled 占位）。
 * Run: npm run verify:profile-panel
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot
const topbar = readFileSync(join(root, 'src/renderer/src/layout/TopBar.tsx'), 'utf8')
const profile = readFileSync(join(root, 'src/renderer/src/features/profile/ProfileModal.tsx'), 'utf8')

assert.match(topbar, /key:\s*['"]profile['"]/)
assert.match(topbar, /setProfileOpen\(true\)/)
assert.match(topbar, /<ProfileModal/)
assert.doesNotMatch(profile, /\bdisabled\b/, 'ProfileModal should not disable fields')

console.log('verify:profile-panel: ok')
