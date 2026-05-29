/**
 * AUTO-02 — renderer 引用的 i18n key 在 zh-CN / en-US 均存在。
 * Run: npm run verify:i18n-keys
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'
import zhCN from '../../src/renderer/src/i18n/locales/zh-CN.ts'
import enUS from '../../src/renderer/src/i18n/locales/en-US.ts'

const root = projectRoot
const zhKeys = new Set(Object.keys(zhCN))
const enKeys = new Set(Object.keys(enUS))

const KEY_PATTERNS = [
  /\bt\(\s*['"]([^'"]+)['"]/g,
  /\bt\(\s*['"]([^'"]+)['"]\s*,/g,
  /key:\s*['"]([^'"]+)['"]/g,
  /MessageKey\s*=\s*['"]([^'"]+)['"]/g
]

const IGNORE = new Set(['', 'a', 'div', 'span', 'path', 'id', 'type', 'name', 'title', 'url'])

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === 'locales') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p)
  }
}

const rendererRoot = join(root, 'src/renderer/src')
const files: string[] = []
walk(rendererRoot, files)

const used = new Set<string>()
for (const file of files) {
  const src = readFileSync(file, 'utf8')
  for (const re of KEY_PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(src)) !== null) {
      const key = m[1]!
      if (key.includes('.') && !IGNORE.has(key)) used.add(key)
    }
  }
}

const missingZh: string[] = []
const missingEn: string[] = []
for (const key of [...used].sort()) {
  if (!zhKeys.has(key)) missingZh.push(key)
  if (!enKeys.has(key)) missingEn.push(key)
}

assert.ok(missingZh.length === 0, `missing zh-CN: ${missingZh.slice(0, 12).join(', ')}`)
assert.ok(missingEn.length === 0, `missing en-US: ${missingEn.slice(0, 12).join(', ')}`)

console.log(`verify:i18n-keys OK (${used.size} keys referenced, ${zhKeys.size} locale entries)`)
